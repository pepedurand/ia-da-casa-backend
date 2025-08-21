import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ResponseInput, Tool } from 'openai/resources/responses/responses';

type Intervalo = { abre: string; fecha: string };

const BUSINESS_TZ = process.env.BUSINESS_TZ || 'America/Sao_Paulo';

// Novo tipo de funcionamento
type FuncSlot = { abre: string; fecha: string };
type Evento = {
  names: string[];
  dias: number[];
  abre: string;
  fecha: string;
  obs?: string;
};

export const FUNCIONAMENTO: Record<number, FuncSlot[]> = {
  0: [
    { abre: '10:00', fecha: '13:00' },
    { abre: '13:00', fecha: '18:00' },
  ],
  1: [{ abre: '12:00', fecha: '16:00' }],
  2: [{ abre: '12:00', fecha: '16:00' }],
  3: [
    { abre: '12:00', fecha: '15:00' },
    { abre: '18:00', fecha: '23:00' },
  ],
  4: [{ abre: '12:00', fecha: '23:00' }],
  5: [{ abre: '12:00', fecha: '23:00' }],
  6: [
    { abre: '10:00', fecha: '13:00' },
    { abre: '13:00', fecha: '23:00' },
  ],
};

export const EVENTOS: Evento[] = [
  {
    names: ['Café da manhã', 'café', 'breakfast'],
    dias: [0, 6],
    abre: '10:00',
    fecha: '13:00',
  },
  {
    names: ['Menu executivo', 'executivo', 'prato do dia', 'almoço executivo'],
    dias: [1, 2, 3, 4, 5],
    abre: '12:00',
    fecha: '16:00',
  },
  {
    names: ['Fondue da Glória', 'fondue', 'fundue', 'fondue da casa'],
    dias: [3, 4, 5, 6],
    abre: '19:00',
    fecha: '23:00',
    obs: 'Servido por tempo limitado',
  },

  {
    names: ['Música ao vivo', 'música', 'show', 'som ao vivo'],
    dias: [5],
    abre: '19:00',
    fecha: '23:00',
  },
  {
    names: ['Jantar', 'dinner', 'refeição noturna'],
    dias: [3, 4, 5, 6],
    abre: '18:00',
    fecha: '23:00',
  },
  {
    names: ['Almoço e jantar', 'almoço', 'lunch'],
    dias: [6],
    abre: '13:00',
    fecha: '23:00',
  },
];

const SYSTEM_INSTRUCTIONS = `
Você é uma atendente simpática e prestativa do restaurante Bistrô da Casa. Use sempre as funções disponíveis para responder com precisão.

Nunca invente informações sobre horários ou eventos. Utilize as funções corretamente.
Sempre cumprimente o cliente com alegria, com um "Olá!" ou "Obrigado pelo contato".
Evite responder em tópicos, prefira frases.
Ao ser referir a eventos ou horário, prefira o termo programação.
Pergunte se precisar de mais informações.
Evite dizer que estamos fechados.
Evite dizer que não temos algo, em vez disso, ofereça alternativas ou destaque outras opções disponíveis.
Final de semana é sábado e domingo!

### Quando usar as funções:

- **get_open_status**: Use quando perguntarem “vocês estão abertos agora?” ou “qual o horário hoje?”. 
  Responda se está aberto, a próxima abertura/fechamento e a programação de hoje.

- **get_evento_info(nomeEvento)**:
  - Quando o cliente pergunta sobre um evento específico, como "quando tem fondue?", "tem música ao vivo?", "tem menu executivo?", "tem café da manhã?", "tem almoço ou jantar?".
  - Mesmo que o cliente use palavras genéricas como "vocês têm executivo?", "tem fondue hoje?", "e jantar?", "servem almoço?", chame a função passando o nome do evento citado.
  - Sempre que uma pergunta citar algo do tipo: fondue, música ao vivo, menu executivo, café da manhã, almoço, jantar — chame "get_evento_info".
  - Se houver o campo observacao no retorno, você pode mencioná-lo após descrever os dias e horários do evento. Exemplo: “O fondue é servido de quarta a sábado, das 19h às 23h. Por tempo limitado!”
  - Ao responder com get_evento_info, só mencione sugestões alternativas (como Menu Executivo ou cardápio completo) se a pergunta indicar que o cliente quer saber se tem o evento hoje (ex: “tem fondue hoje?” ou “hoje tem fondue?”).
  - Se a pergunta for genérica (“quais os dias do fondue?”), apenas responda os dias e horários do evento e, se existir, inclua a observação.

- **get_programacao(dias)**: Use quando perguntarem “que horas vocês abrem?”, “qual o horário de funcionamento?”, 
  ou qualquer pergunta genérica sobre abertura/fechamento sem referência a “hoje” ou “agora”. 
  Nesse caso, mostre a programação completa da semana (funcionamento + eventos).
  - Quando houver "observacoes.destaquesNoite", destaque em frase única os dois marcos: 
  “a partir das {inicio} servimos o cardápio completo (jantar); e a partir das {inicio} também o Fondue da Glória.”


- **Sobre "amanhã"**:  
  Se o cliente perguntar algo como “que horas vocês abrem amanhã?” ou “qual a programação de amanhã?”, 
  você deve calcular o dia real de amanhã (new Date().getDay() + 1) e chamar "get_programacao" passando esse dia da semana.  
  Nunca presuma o dia de amanhã, sempre use a data real atual como referência.

### Como responder:

- Sempre responda de forma clara, acolhedora e simpática.
- Quando algo não estiver disponível, ofereça alternativas ou destaque outras atrações.
- Ao listar programação, organize por dia e horário.
- Quando a pergunta citar “hoje” sobre um evento que não ocorre hoje, informe educadamente os dias/horários em que ele acontece e, em seguida, ofereça alternativas com base em "sugestoesHoje" retornadas pela função — por exemplo: “Hoje temos menu executivo das 12h às 16h e o cardápio completo nos demais horários de funcionamento.”
- Ao falar de programação de um dia específico, mencione que o cardápio completo começa às 12h de segunda a sexta, e às 13h aos sábados e domingos. Quando possível, use “Cardápio completo a partir das {hora}”.
- Se a pergunta citar um dia específico (ex.: “amanhã tem café da manhã?”, “na sexta tem fondue?”) e o evento **não ocorrer nesse dia**, primeiro informe **quando esse evento acontece na semana** (ex.: “Nosso café da manhã é servido aos sábados e domingos, das 10h às 13h.”). Em seguida, mostre a **programação desse dia**: Menu Executivo (se houver), “cardápio completo a partir das {hora}”, e atrações da noite (fondue, música ao vivo), quando aplicável.
- Para perguntas do tipo “amanhã tem {evento}?”, calcule o dia real de amanhã e chame **get_evento_info(nomeEvento, dia=amanhã)** para saber se o evento ocorre nesse dia; e complemente a resposta com a **programação do dia**.
Se a pergunta citar um dia específico (ex.: “amanhã tem café da manhã?”, “na sexta tem fondue?”) e o evento **não ocorrer nesse dia**, responda em duas partes:  
1. Diga gentilmente quando esse evento é servido na semana.  
2. Logo depois, explique o que temos nesse dia, de forma fluida, por exemplo:  
   “Nosso café da manhã é servido apenas sábado e domingo, das 10h às 13h. No sábado e domingo temos também cardápio completo a partir das 13h. Já na sexta, em vez disso, temos Menu Executivo das 12h às 16h, cardápio completo a partir das 12h e, à noite, Fondue da Glória com música ao vivo a partir das 19h.”

#### Exemplos:

**Cliente**: "Vocês têm menu executivo?"  
**Você**: Temos sim! O Menu Executivo é servido de segunda a sexta, das 12h às 16h. Uma ótima opção para o almoço! 😋

**Cliente**: "Tem cafe da manha hoje?" // nesse dia não tem café da manhã  
**Você**: Olá! Nosso café da manhã é servido aos sábados e domingos, das 10h às 13h. Hoje temos Menu Executivo das 12h às 16h e cardápio completo nos demais horários de funcionamento.

**Cliente**: "Qual a programação do fim de semana?"  
**Você**: Neste fim de semana temos:  
Sábado: Café da manhã das 10h às 13h, almoço e jantar das 13h às 23h.  
Domingo: Café da manhã das 10h às 13h e almoço das 13h às 18h.  

**Cliente**: "Que horas vocês abrem amanhã?"  
**Você**: Amanhã, quarta-feira, abrimos das 12h às 15h e depois das 18h às 23h, com nosso fondue da Glória no jantar.  
`.trim();

enum toolTypes {
  FUNCTION = 'function',
}

const tools: Tool[] = [
  {
    type: toolTypes.FUNCTION,
    name: 'get_open_status',
    description:
      'Retorna se o restaurante está aberto agora e os horários do dia.',
    parameters: {
      type: 'object',
      properties: {
        isoDatetime: { type: 'string' },
      },
      required: ['isoDatetime'],
    },
    strict: false,
  },
  {
    type: toolTypes.FUNCTION,
    name: 'get_evento_info',
    description:
      'Retorna dias e horários em que um evento (como fondue) acontece.',
    parameters: {
      type: 'object',
      properties: {
        nomeEvento: { type: 'string' },
        dia: {
          type: 'number',
          minimum: 0,
          maximum: 6,
          description:
            'Dia da semana para saber se o evento ocorre (0 = domingo, 6 = sábado)',
        },
      },
      required: ['nomeEvento'],
    },
    strict: false,
  },

  {
    type: toolTypes.FUNCTION,
    name: 'get_programacao',
    strict: false,
    description:
      'Retorna os eventos e horários de funcionamento de dias específicos (ex: fim de semana).',
    parameters: {
      type: 'object',
      properties: {
        dias: {
          type: 'array',
          items: { type: 'number', minimum: 0, maximum: 6 },
          description: 'Array com os dias da semana (0=domingo, 6=sábado)',
        },
      },
      required: [],
    },
  },
];

@Injectable()
export class AtendenteService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async perguntarProAtendente(prompt: string): Promise<string> {
    // Obtém data e dia da semana atuais
    const now = this.nowPartsInTZ();
    const diasMap = [
      'domingo',
      'segunda-feira',
      'terça-feira',
      'quarta-feira',
      'quinta-feira',
      'sexta-feira',
      'sábado',
    ];
    const dataHoje = now.isoLocal.split('T')[0];
    const diaSemana = diasMap[now.weekdayIndex];

    // Adiciona contexto ao prompt do usuário
    const promptComData = `Hoje é ${dataHoje} (${diaSemana}). ${prompt}`;

    const input: ResponseInput = [
      { role: 'system', content: SYSTEM_INSTRUCTIONS },
      { role: 'user', content: promptComData },
    ];

    let resp = await this.openai.responses.create({
      model: 'gpt-4o-mini',
      input,
      tools,
      tool_choice: 'auto',
    });

    for (const output of resp.output) {
      if (output.type !== 'function_call') continue;

      const name = output.name;
      const args = JSON.parse(output.arguments);
      const result = this.callFunction(name, args);

      input.push({
        role: 'assistant',
        content: `Chamando função ${name} com argumentos: ${output.arguments}`,
      });

      input.push({
        role: 'user',
        content: `Resultado da função ${name}: ${JSON.stringify(result)}`,
      });
    }

    resp = await this.openai.responses.create({
      model: 'gpt-4o-mini',
      input,
      tools,
      tool_choice: 'auto',
    });

    return resp.output_text ?? '';
  }

  private callFunction(name: string, args: any) {
    switch (name) {
      case 'get_open_status':
        return this.verificaSeEstaAberto();
      case 'get_evento_info':
        return this.getEventoInfo(args.nomeEvento, args.dia);
      case 'get_programacao':
        return this.getProgramacao(args.dias);
      default:
        return { error: 'Função desconhecida' };
    }
  }

  private verificaSeEstaAberto() {
    const now = this.nowPartsInTZ(); // usa BUSINESS_TZ
    const diaSemana = now.weekdayIndex;
    const minutosAgora = now.hour * 60 + now.minute;
    const hoje = FUNCIONAMENTO[diaSemana] || [];

    let abertoAgora = false;
    let proximaAbertura: string | null = null;
    let proximoFechamento: string | null = null;

    const hhmmParaMinutos = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };

    for (const slot of hoje) {
      const ini = hhmmParaMinutos(slot.abre);
      const fim = hhmmParaMinutos(slot.fecha);

      if (minutosAgora >= ini && minutosAgora < fim) {
        abertoAgora = true;
        proximoFechamento = slot.fecha;
        break;
      }
      if (minutosAgora < ini && !proximaAbertura) {
        proximaAbertura = slot.abre;
      }
    }

    if (!abertoAgora && !proximaAbertura) {
      const amanha = (diaSemana + 1) % 7;
      const slotsAmanha = FUNCIONAMENTO[amanha] || [];
      if (slotsAmanha.length) {
        proximaAbertura = `amanhã às ${slotsAmanha[0].abre}`;
      }
    }

    // 👉 Anexa a programação de hoje
    const programacaoHoje = this.getProgramacaoDoDia(diaSemana);

    return {
      agoraLocal: now.isoLocal,
      timezone: BUSINESS_TZ,
      diaSemana,
      abertoAgora,
      hoje,
      proximaAbertura,
      proximoFechamento,
      programacaoHoje,
    };
  }

  private cardapioCompletoInicio(dia: number): string {
    // 0=domingo, 6=sábado
    return dia === 0 || dia === 6 ? '13:00' : '12:00';
  }
  private getEventoInfo(nome: string, diaOverride?: number) {
    const normaliza = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    const nomeNormalizado = normaliza(nome);

    // tenta por match direto do nome
    let evento = EVENTOS.find((e) =>
      e.names.some((n) => normaliza(n).includes(nomeNormalizado)),
    );

    // fallback: token por token
    if (!evento) {
      const palavras = nomeNormalizado.split(/\s+/);
      evento = EVENTOS.find((e) =>
        palavras.some((p) => e.names.some((n) => normaliza(n).includes(p))),
      );
    }

    if (!evento) return { encontrado: false };

    const diasMap = [
      'domingo',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sábado',
    ];
    const dias = evento.dias.map((i) => diasMap[i]);

    // helper para listar dias de forma natural
    const listaNatural = (arr: string[]) => {
      if (arr.length <= 1) return arr.join('');
      if (arr.length === 2) return `${arr[0]} e ${arr[1]}`;
      return `${arr.slice(0, -1).join(', ')} e ${arr[arr.length - 1]}`;
    };

    const now = this.nowPartsInTZ();
    const diaReferencia = diaOverride ?? now.weekdayIndex;
    const perguntaRefereAoDia = diaOverride !== undefined; // pode ser "amanhã", "sexta", etc.
    const disponivelNesseDia = evento.dias.includes(diaReferencia);

    // programa/resumo do dia perguntado (se a pergunta fixar um dia)
    const programacaoDoDia = perguntaRefereAoDia
      ? this.resumoDoDia(diaReferencia)
      : null;

    // alternativas quando o evento não ocorre no dia perguntado
    let sugestoesDoDia: { nome: string[]; abre: string; fecha: string }[] = [];
    if (perguntaRefereAoDia && !disponivelNesseDia && programacaoDoDia) {
      if (programacaoDoDia.executivo) {
        sugestoesDoDia.push({
          nome: ['Menu Executivo', 'executivo', 'almoço executivo'],
          abre: programacaoDoDia.executivo.abre,
          fecha: programacaoDoDia.executivo.fecha,
        });
      }

      // Cardápio completo a partir de {hora}
      const cardapioIntervals = this.menuCompletoIntervalsForDay(diaReferencia);
      if (cardapioIntervals.length) {
        // força a 1ª faixa a iniciar no "a partir de"
        const primeira = {
          ...cardapioIntervals[0],
          abre: programacaoDoDia.cardapioCompletoInicio,
        };
        const faixas = [primeira, ...cardapioIntervals.slice(1)];
        sugestoesDoDia = sugestoesDoDia.concat(
          faixas.map((iv) => ({
            nome: ['Cardápio completo', 'menu completo'],
            abre: iv.abre,
            fecha: iv.fecha,
          })),
        );
      }

      if (programacaoDoDia.fondue) {
        sugestoesDoDia.push({
          nome: ['Fondue da Glória', 'fondue'],
          abre: programacaoDoDia.fondue.abre,
          fecha: programacaoDoDia.fondue.fecha,
        });
      }
      if (programacaoDoDia.musicaAoVivo) {
        sugestoesDoDia.push({
          nome: ['Música ao vivo', 'show', 'som ao vivo'],
          abre: programacaoDoDia.musicaAoVivo.abre,
          fecha: programacaoDoDia.musicaAoVivo.fecha,
        });
      }
    }

    // moldes de texto suaves para a IA montar a resposta
    const quandoOcorre =
      `O ${evento.names[0]} é servido ${listaNatural(dias)}` +
      `, das ${evento.abre} às ${evento.fecha}${evento.obs ? `. ${evento.obs}` : ''}.`;

    const resumoDia = programacaoDoDia
      ? (() => {
          const partes: string[] = [];

          // sempre mencionar "cardápio completo a partir de"
          partes.push(
            `cardápio completo a partir das ${programacaoDoDia.cardapioCompletoInicio}`,
          );

          if (programacaoDoDia.executivo) {
            partes.unshift(
              `Menu Executivo das ${programacaoDoDia.executivo.abre} às ${programacaoDoDia.executivo.fecha}`,
            );
          }
          if (programacaoDoDia.fondue) {
            partes.push(
              `Fondue da Glória a partir das ${programacaoDoDia.fondue.abre}`,
            );
          }
          if (programacaoDoDia.musicaAoVivo) {
            partes.push(
              `música ao vivo a partir das ${programacaoDoDia.musicaAoVivo.abre}`,
            );
          }

          // junta de forma natural
          if (partes.length === 1) return `Nesse dia temos ${partes[0]}.`;
          if (partes.length === 2)
            return `Nesse dia temos ${partes[0]} e ${partes[1]}.`;
          return `Nesse dia temos ${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}.`;
        })()
      : null;

    return {
      encontrado: true,
      nome: evento.names,
      dias,
      horario: { abre: evento.abre, fecha: evento.fecha },
      disponivelNesseDia,
      perguntaRefereAoDia,
      programacaoDoDia, // { cardapioCompletoInicio, executivo?, fondue?, musicaAoVivo? }
      sugestoesDoDia, // alternativas amigáveis para o dia perguntado (se não ocorrer)
      observacao: evento.obs ?? null,
      explicacaoNatural: { quandoOcorre, resumoDia }, // 👈 novos moldes de texto prontos
    };
  }

  private resumoDoDia(dia: number) {
    const inicioCardapio = this.cardapioCompletoInicio(dia);
    const eventosDia = EVENTOS.filter((e) => e.dias.includes(dia));

    const temExecutivo = eventosDia.find((e) =>
      e.names.some((n) => n.toLowerCase().includes('executivo')),
    );
    const temFondue = eventosDia.find((e) =>
      e.names.some((n) => n.toLowerCase().includes('fondue')),
    );
    const temMusica = eventosDia.find((e) =>
      e.names.some((n) => n.toLowerCase().includes('música')),
    );

    return {
      cardapioCompletoInicio: inicioCardapio, // "12:00" seg–sex | "13:00" sáb–dom
      executivo: temExecutivo
        ? { abre: temExecutivo.abre, fecha: temExecutivo.fecha }
        : null,
      fondue: temFondue
        ? { abre: temFondue.abre, fecha: temFondue.fecha }
        : null,
      musicaAoVivo: temMusica
        ? { abre: temMusica.abre, fecha: temMusica.fecha }
        : null,
    };
  }

  private getProgramacao(dias: number[] = [0, 1, 2, 3, 4, 5, 6]) {
    const diasMap = [
      'domingo',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sábado',
    ];

    const programacao = dias.map((dia) => {
      const eventosHoje = EVENTOS.filter((evento) => evento.dias.includes(dia));
      const funcionamentoHoje = FUNCIONAMENTO[dia] || [];

      return {
        dia,
        nome: diasMap[dia],
        funcionamento: funcionamentoHoje,
        eventos: eventosHoje.map((e) => ({
          nome: e.names,
          abre: e.abre,
          fecha: e.fecha,
        })),
        // 👇 novo: já manda “a partir de X” por dia
        cardapioCompletoInicio: this.cardapioCompletoInicio(dia),
      };
    });

    return { programacao };
  }

  private getProgramacaoDoDia(dia: number) {
    const diasMap = [
      'domingo',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sábado',
    ];
    const funcionamentoHoje = FUNCIONAMENTO[dia] || [];
    const eventosHoje = EVENTOS.filter((e) => e.dias.includes(dia));

    const eventos = eventosHoje.map((e) => ({
      nome: e.names,
      abre: e.abre,
      fecha: e.fecha,
    }));

    const temJantar = eventosHoje.find((e) =>
      e.names.some((n) => n.toLowerCase().includes('jantar')),
    );
    const temFondue = eventosHoje.find((e) =>
      e.names.some((n) => n.toLowerCase().includes('fondue')),
    );

    const observacoes: {
      cardapioCompletoInicio?: string;
      destaquesNoite?: Array<{ inicio: string; descricao: string }>;
    } = {};

    // 👇 novo: sempre informar a partir de quando há cardápio completo
    observacoes.cardapioCompletoInicio = this.cardapioCompletoInicio(dia);

    if (temJantar && temFondue) {
      observacoes.destaquesNoite = [
        { inicio: temJantar.abre, descricao: 'Cardápio completo (jantar)' },
        { inicio: temFondue.abre, descricao: 'Fondue da Glória' },
      ];
    }

    return {
      dia,
      nomeDia: diasMap[dia],
      funcionamento: funcionamentoHoje,
      eventos,
      observacoes,
    };
  }

  private nowPartsInTZ(tz = BUSINESS_TZ) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    }).formatToParts(new Date());

    const get = (type: string) => parts.find((p) => p.type === type)?.value!;
    const weekdayShort = get('weekday'); // Sun, Mon, ...
    const mapWeek: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const y = get('year'),
      m = get('month'),
      d = get('day');
    const h = get('hour'),
      min = get('minute'),
      s = get('second');

    // “ISO local” útil para logs
    const isoLocal = `${y}-${m}-${d}T${h}:${min}:${s}`;
    return {
      weekdayIndex: mapWeek[weekdayShort],
      hour: Number(h),
      minute: Number(min),
      isoLocal,
    };
  }

  private hhmmToMin(hhmm: string) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }
  private minToHHMM(x: number) {
    const h = Math.floor(x / 60),
      m = x % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  private subtractIntervals(base: Intervalo[], cut: Intervalo[]): Intervalo[] {
    let res: Intervalo[] = [...base];
    for (const c of cut) {
      const next: Intervalo[] = [];
      for (const b of res) {
        const bi = this.hhmmToMin(b.abre),
          bf = this.hhmmToMin(b.fecha);
        const ci = this.hhmmToMin(c.abre),
          cf = this.hhmmToMin(c.fecha);
        if (bf <= ci || bi >= cf) {
          next.push(b);
          continue;
        } // sem overlap
        if (bi < ci) next.push({ abre: b.abre, fecha: this.minToHHMM(ci) });
        if (bf > cf) next.push({ abre: this.minToHHMM(cf), fecha: b.fecha });
      }
      res = next;
    }
    return res;
  }
  private breakfastIntervalsForDay(dia: number): Intervalo[] {
    const cafe = EVENTOS.filter(
      (e) =>
        e.names.some((n) => n.toLowerCase().includes('café da manhã')) &&
        e.dias.includes(dia),
    );
    return cafe.map((e) => ({ abre: e.abre, fecha: e.fecha }));
  }
  private menuCompletoIntervalsForDay(dia: number): Intervalo[] {
    const funcionamento = (FUNCIONAMENTO[dia] || []).map((s) => ({
      abre: s.abre,
      fecha: s.fecha,
    }));
    const semCafe = this.subtractIntervals(
      funcionamento,
      this.breakfastIntervalsForDay(dia),
    );
    return semCafe.sort((a, b) => a.abre.localeCompare(b.abre));
  }
}
