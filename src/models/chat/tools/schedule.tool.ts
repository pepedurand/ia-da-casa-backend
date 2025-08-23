import { Injectable } from '@nestjs/common';
import { horariosDeFuncionamento, informacoes, programacao } from '../database';

type Args = {
  data_ou_periodo?: string; // ex.: hoje, amanhã, sábado, final de semana
  periodo_generico?: boolean; // ex.: semana, mês, ano
  informacao?: string; // ex.: fondue, cardápio, reservas
  visao_geral?: boolean; // visão geral do bistrô
  informacao_generica?: boolean; // "programação", "eventos" etc.
  periodo_referencial?: boolean; // true só para hoje/amanhã/depois de amanhã
};

@Injectable()
export class ScheduleTool {
  execute(args: Args, hoje: Date = new Date()): string {
    console.log(args);

    if (
      args.data_ou_periodo &&
      (args.informacao_generica || !args.informacao)
    ) {
      console.log('caiu no periodo');
      return this.compiladoPeriodo(args, hoje);
    }

    if ((!args.data_ou_periodo || args.periodo_generico) && args.informacao) {
      console.log('caiu na informação');
      return this.compiladoInformacaoSemPeriodo(args);
    }

    if (
      args.data_ou_periodo &&
      args.informacao &&
      !args.informacao_generica &&
      !args.periodo_generico
    ) {
      console.log('caiu na informação com periodo');
      return this.compiladoPeriodoEInformacaoEspecifica(args, hoje);
    }

    if (
      args.visao_geral ||
      (!args.data_ou_periodo &&
        !args.informacao &&
        !args.informacao_generica &&
        !args.periodo_generico)
    ) {
      return this.compiladoGeral();
    }

    console.log('caiu no geral');
    return this.compiladoGeral();
  }

  /** === VISÃO GERAL === */
  private compiladoGeral(): string {
    const linhas: string[] = [];
    linhas.push(`Claro! Aqui vai um resumo geral do Bistrô da Casa 🍽️`);

    // horários semanais
    linhas.push(`### Horários de funcionamento`);
    for (const h of horariosDeFuncionamento) {
      const faixas = h.horarios.map((f) =>
        f.fim ? `${f.inicio}–${f.fim}` : `a partir das ${f.inicio}`,
      );
      linhas.push(`- **${this.capitalize(h.nome)}**: ${faixas.join(', ')}`);
    }

    // programações
    linhas.push(`\n### Programação`);
    for (const p of programacao) {
      linhas.push(`- **${this.capitalize(p.nomes[0])}**: ${p.descricao || ''}`);
    }

    // infos úteis
    linhas.push(`\n### Informações úteis`);
    const infosPrincipais = informacoes.filter((i) =>
      ['cardapio', 'reservas', 'endereco'].some((k) =>
        i.nomes.some((n) => n.toLowerCase().includes(k)),
      ),
    );
    for (const i of infosPrincipais) {
      linhas.push(...i.observacoes.map((o) => `- ${o}`));
    }

    return linhas.join('\n');
  }

  /** === INFORMAÇÃO SEM PERÍODO === */
  private compiladoInformacaoSemPeriodo(args: Args): string {
    const linhas: string[] = [];
    const termos = args.informacao
      ? args.informacao
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .split(/\s+|,|;/)
          .filter((t) => t.length > 2)
      : [];

    const encontradosProg = new Set<string>();
    const encontradosInfo = new Set<string>();

    const isTermoCardapio = (t: string) =>
      /\b(cardapio|menu|valores)\b/.test(t); // cobre "cardapio", "menu", "valores"

    for (const termo of termos) {
      // tenta casar informacoes e programacao para o mesmo termo
      const info = informacoes.find((i) =>
        i.nomes.some((n) =>
          n
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .includes(termo),
        ),
      );
      const prog = programacao.find((p) =>
        p.nomes.some((n) =>
          n
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .includes(termo),
        ),
      );

      // 🔀 Regra de precedência:
      // - Se o termo é "cardápio/menu/valores" e informacao_generica == true,
      //   priorize o bloco de INFORMACOES e suprimia o bloco de PROGRAMACAO (menu completo).
      const deveSuprimirProgCardapio =
        args.informacao_generica === true && isTermoCardapio(termo) && !!info;

      // 1) INFORMACOES
      if (info && !encontradosInfo.has(info.nomes[0])) {
        encontradosInfo.add(info.nomes[0]);
        linhas.push(...info.observacoes);
      }

      // 2) PROGRAMACAO (suprimida quando for cardápio genérico)
      if (
        prog &&
        !deveSuprimirProgCardapio &&
        !encontradosProg.has(prog.nomes[0])
      ) {
        encontradosProg.add(prog.nomes[0]);
        for (const dia of prog.horarios) {
          const faixa = dia.horarios.map((f) =>
            f.fim ? `${f.inicio}–${f.fim}` : `a partir das ${f.inicio}`,
          );
          linhas.push(
            `**${this.capitalize(dia.nome)}**: ${faixa.join(', ')} (${this.capitalize(prog.nomes[0])})`,
          );
        }
        if (prog.descricao) linhas.push(prog.descricao);
      }
    }

    // ✅ só pergunta pelo link se ainda não apareceu nenhum
    const jaTemLink = linhas.some((l) => l.includes('linktr.ee/bitrodacasa'));
    if (!jaTemLink) {
      linhas.push(`Posso te enviar o link de reserva?`);
    }

    return linhas.join('\n');
  }

  /** === APENAS PERÍODO === */
  private compiladoPeriodo(args: Args, hoje: Date): string {
    const { diasIdx, labels } = this.resolvePeriodo(
      args.data_ou_periodo,
      hoje,
      args.periodo_referencial,
    );
    const linhas: string[] = [];

    for (let k = 0; k < diasIdx.length; k++) {
      const labelDia = labels[k];

      const geralDoDia = horariosDeFuncionamento.find(
        (h) => h.nome === labelDia,
      );
      if (geralDoDia) {
        const faixas = geralDoDia.horarios.map((f) =>
          f.fim ? `${f.inicio}–${f.fim}` : `a partir das ${f.inicio}`,
        );
        linhas.push(`**${this.capitalize(labelDia)}**: ${faixas.join(', ')}.`);
      }

      const eventosDoDia = programacao.filter((p) =>
        p.horarios.some((h) => h.nome === labelDia),
      );
      for (const ev of eventosDoDia) {
        const dia = ev.horarios.find((h) => h.nome === labelDia);
        if (dia) {
          const faixa = dia.horarios.map((f) =>
            f.fim ? `${f.inicio}–${f.fim}` : `a partir das ${f.inicio}`,
          );
          linhas.push(
            `**${this.capitalize(ev.nomes[0])}**: ${faixa.join(', ')}`,
          );
        }
        if (ev.descricao) linhas.push(ev.descricao);
      }

      if (k < diasIdx.length - 1) linhas.push('');
    }

    const jaTemLink = linhas.some((l) => l.includes('linktr.ee/bitrodacasa'));
    if (!jaTemLink) {
      linhas.push(`Posso te enviar o link de reserva?`);
    }

    return linhas.join('\n');
  }

  /** === PERÍODO + INFORMAÇÃO === */
  private compiladoPeriodoEInformacaoEspecifica(
    args: Args,
    hoje: Date,
  ): string {
    const { diasIdx, labels } = this.resolvePeriodo(
      args.data_ou_periodo,
      hoje,
      args.periodo_referencial,
    );

    const linhas: string[] = [];

    // 1) Resumo COMPLETO do(s) dia(s) do período (já lista "Menu completo", executivo, fondue, etc.)
    for (let k = 0; k < diasIdx.length; k++) {
      const labelDia = labels[k];

      const geralDoDia = horariosDeFuncionamento.find(
        (h) => h.nome === labelDia,
      );
      if (geralDoDia) {
        const faixas = this.formatFaixas(geralDoDia.horarios);
        linhas.push(`**${this.capitalize(labelDia)}**: ${faixas}.`);
      }

      const eventosDoDia = programacao.filter((p) =>
        p.horarios.some((h) => h.nome === labelDia),
      );
      for (const ev of eventosDoDia) {
        const dia = ev.horarios.find((h) => h.nome === labelDia);
        if (dia) {
          const faixa = this.formatFaixas(dia.horarios);
          linhas.push(`**${this.capitalize(ev.nomes[0])}**: ${faixa}`);
        }
        if (ev.descricao) linhas.push(ev.descricao);
      }

      if (k < diasIdx.length - 1) linhas.push('');
    }

    // 2) Termos: permite múltiplas "informações" (ex.: "reserva" + "fondue")
    const termos = args.informacao
      ? args.informacao
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .split(/\s+|,|;/)
          .filter((t) => t.length > 2)
      : [];

    const isTermoCardapio = (t: string) =>
      /\b(cardapio|menu|valores)\b/.test(t);

    // 3) Para cada termo, priorizar:
    // - Se for "cardápio/menu/valores": MOSTRAR SÓ LINK (sem bloco de agenda "menu completo")
    // - Para outros (ex.: "fondue", "reservas"): puxar observações e/ou agenda dedicada
    const encontradosProg = new Set<string>();
    const encontradosInfo = new Set<string>();

    for (const termo of termos) {
      const normMatch = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '');

      const info = informacoes.find((i) =>
        i.nomes.some((n) => normMatch(n).includes(termo)),
      );
      const prog = programacao.find((p) =>
        p.nomes.some((n) => normMatch(n).includes(termo)),
      );

      const termoEhCardapio = isTermoCardapio(termo);

      // 3a) Cardápio: só link (se existir)
      if (termoEhCardapio && info && !encontradosInfo.has(info.nomes[0])) {
        encontradosInfo.add(info.nomes[0]);
        linhas.push(...info.observacoes);
        // NÃO criar bloco "Agenda completa" de "menu completo" aqui,
        // pois o resumo do dia já mostrou se há "menu completo" nesse(s) dia(s).
        continue; // pula para próximo termo
      }

      // 3b) Outros termos: exibir informações soltas (ex.: reservas)
      if (info && !encontradosInfo.has(info.nomes[0])) {
        encontradosInfo.add(info.nomes[0]);
        linhas.push(...info.observacoes);
      }

      // 3c) Agenda dedicada do item solicitado (quando fizer sentido)
      if (prog && !encontradosProg.has(prog.nomes[0])) {
        // Evita criar "Agenda completa" para "menu completo" (já coberto no resumo)
        const isMenuCompleto = prog.nomes.some((n) =>
          normMatch(n).includes('menu completo'),
        );
        if (!termoEhCardapio && !isMenuCompleto) {
          linhas.push('');
          linhas.push(
            `### ${this.capitalize(prog.nomes[0])} — Agenda completa`,
          );
          for (const d of prog.horarios) {
            const faixa = this.formatFaixas(d.horarios);
            linhas.push(`- **${this.capitalize(d.nome)}**: ${faixa}`);
          }

          // sinaliza se NÃO rola no(s) dia(s) do período
          const diasDoItem = new Set(prog.horarios.map((h) => h.nome));
          for (const labelDia of labels) {
            if (!diasDoItem.has(labelDia as any)) {
              linhas.push(`- **${this.capitalize(labelDia)}**: não acontece.`);
            }
          }

          if (prog.descricao) linhas.push(prog.descricao);
        }
        encontradosProg.add(prog.nomes[0]);
      }
    }

    // 4) Deduplicação de link de reserva
    const jaTemLink = linhas.some((l) => l.includes('linktr.ee/bitrodacasa'));
    if (!jaTemLink) {
      linhas.push(`Posso te enviar o link de reserva?`);
    }

    return linhas.join('\n');
  }

  /** Utils */
  private formatFaixas(faixas: { inicio: string; fim?: string }[]) {
    return faixas
      .map((f) => (f.fim ? `${f.inicio}–${f.fim}` : `a partir das ${f.inicio}`))
      .join(', ');
  }
  private resolvePeriodo(
    periodo?: string,
    hoje: Date = new Date(),
    referencial = false,
  ) {
    const dias = [
      'domingo',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sábado',
    ];

    const norm = (s?: string) =>
      (s || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();

    // normaliza entrada: remove "-feira"/" feira", espaços extras e preposições comuns
    let p = norm(periodo)
      .replace(/-?feira\b/g, '') // "sexta-feira" -> "sexta"
      .replace(/\b(na|no|de|da|do|pra|para|pro)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // sinônimos de fim de semana
    const weekendSyn = new Set([
      'fim de semana',
      'final de semana',
      'fds',
      'fim-de-semana',
      'final-de-semana',
    ]);
    if (weekendSyn.has(p)) {
      return { diasIdx: [6, 0], labels: [dias[6], dias[0]] };
    }

    // referenciais simples
    if (referencial) {
      if (p === 'hoje') {
        const i = hoje.getDay();
        return { diasIdx: [i], labels: [dias[i]] };
      }
      if (p === 'amanha' || p === 'amanhã') {
        const i = (hoje.getDay() + 1) % 7;
        return { diasIdx: [i], labels: [dias[i]] };
      }
      if (p === 'depois de amanha' || p === 'depois de amanhã') {
        const i = (hoje.getDay() + 2) % 7;
        return { diasIdx: [i], labels: [dias[i]] };
      }
    }

    // mapeia abreviações e variações: seg/2a, ter/3a, qua/4a, qui/5a, sex/6a, sab/7a
    const aliases: Array<[RegExp, number]> = [
      [/\bdom(ingo)?\b/, 0],
      [/\bseg(unda)?\b|\b2a\b/, 1],
      [/\bter(ca)?\b|\b3a\b/, 2], // "terca" já está sem acento pela norm()
      [/\bqua(rta)?\b|\b4a\b/, 3],
      [/\bqui(nta)?\b|\b5a\b/, 4],
      [/\bsex(ta)?\b|\b6a\b/, 5],
      [/\bsab(ado)?\b|\b7a\b/, 6],
    ];

    for (const [re, idx] of aliases) {
      if (re.test(p)) {
        return { diasIdx: [idx], labels: [dias[idx]] };
      }
    }

    // tentativa por igualdade literal (ex.: "sexta")
    const idx = dias.findIndex((d) => norm(d) === p);
    if (idx >= 0) return { diasIdx: [idx], labels: [dias[idx]] };

    // fallback: hoje
    const i = hoje.getDay();
    return { diasIdx: [i], labels: [dias[i]] };
  }

  private capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
