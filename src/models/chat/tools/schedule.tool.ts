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
      return this.compiladoPeriodo(args, hoje);
    }

    if ((!args.data_ou_periodo || args.periodo_generico) && args.informacao) {
      return this.compiladoInformacaoSemPeriodo(args);
    }

    if (
      args.data_ou_periodo &&
      args.informacao &&
      !args.informacao_generica &&
      !args.periodo_generico
    ) {
      return [
        this.compiladoPeriodo(args, hoje),
        this.compiladoInformacaoSemPeriodo(args),
      ].join('\n\n');
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
      ['cardapio', 'reservas', 'endereco'].some((k) => i.nomes.includes(k)),
    );
    for (const i of infosPrincipais) {
      linhas.push(...i.observacoes.map((o) => `- ${o}`));
    }

    return linhas.join('\n');
  }

  private compiladoInformacaoSemPeriodo(args: Args): string {
    const linhas: string[] = [];
    const normalizado = args.informacao!.toLowerCase();

    const prog = programacao.find((p) =>
      p.nomes.some((n) => n.toLowerCase() === normalizado),
    );
    const info = informacoes.find((i) =>
      i.nomes.some((n) => n.toLowerCase() === normalizado),
    );

    // Se for programação (ex: café da manhã, fondue)
    if (prog) {
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

    // Se for informação solta (ex: reservas, endereço, formas de pagamento)
    if (info) {
      linhas.push(...info.observacoes);
    }

    linhas.push(`Posso te enviar o link de reserva?`);
    return linhas.join('\n');
  }

  /** === APENAS PERÍODO (pode ter múltiplos dias: ex. fim/final de semana) === */
  private compiladoPeriodo(args: Args, hoje: Date): string {
    const { diasIdx, labels } = this.resolvePeriodo(
      args.data_ou_periodo,
      hoje,
      args.periodo_referencial,
    );
    const linhas: string[] = [];

    for (let k = 0; k < diasIdx.length; k++) {
      const labelDia = labels[k];

      // horário do período
      const geralDoDia = horariosDeFuncionamento.find(
        (h) => h.nome === labelDia,
      );
      if (geralDoDia) {
        const faixas = geralDoDia.horarios.map((f) =>
          f.fim ? `${f.inicio}–${f.fim}` : `a partir das ${f.inicio}`,
        );
        linhas.push(`**${this.capitalize(labelDia)}**: ${faixas.join(', ')}.`);
      }

      // eventos do período
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

      if (k < diasIdx.length - 1) linhas.push(''); // separador entre dias
    }

    linhas.push(`Posso te enviar o link de reserva?`);
    return linhas.join('\n');
  }

  /** === PERÍODO + INFORMAÇÃO ESPECÍFICA (ex.: "sábado tem fondue?") === */
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
    const normalizado = args.informacao!.toLowerCase();

    const prog = programacao.find((p) =>
      p.nomes.some((n) => n.toLowerCase() === normalizado),
    );
    const info = informacoes.find((i) =>
      i.nomes.some((n) => n.toLowerCase() === normalizado),
    );

    // 1) Resumo COMPLETO do(s) dia(s) do período
    for (let k = 0; k < diasIdx.length; k++) {
      const labelDia = labels[k];

      // Horário geral do dia
      const geralDoDia = horariosDeFuncionamento.find(
        (h) => h.nome === labelDia,
      );
      if (geralDoDia) {
        const faixas = this.formatFaixas(geralDoDia.horarios);
        linhas.push(`**${this.capitalize(labelDia)}**: ${faixas}.`);
      }

      // TODOS os eventos do dia
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

    // 2) Bloco DEDICADO ao item solicitado (agenda completa)
    if (prog) {
      linhas.push('');
      linhas.push(`### ${this.capitalize(prog.nomes[0])} — Agenda completa`);
      for (const d of prog.horarios) {
        const faixa = this.formatFaixas(d.horarios);
        linhas.push(`- **${this.capitalize(d.nome)}**: ${faixa}`);
      }

      // Sinaliza se NÃO rola no(s) dia(s) do período
      const labelsSet = new Set(labels);
      const diasDoItem = new Set(prog.horarios.map((h) => h.nome));
      for (const labelDia of labels) {
        if (!diasDoItem.has(labelDia as any)) {
          linhas.push(`- **${this.capitalize(labelDia)}**: não acontece.`);
        }
      }

      if (prog.descricao) linhas.push(prog.descricao);
    }

    // 3) Informações soltas relacionadas (links, reservas, etc.)
    if (info) {
      linhas.push(...info.observacoes);
    }

    linhas.push(`Posso te enviar o link de reserva?`);
    return linhas.join('\n');
  }

  /** Utils */
  private formatFaixas(faixas: { inicio: string; fim?: string }[]) {
    return faixas
      .map((f) => (f.fim ? `${f.inicio}–${f.fim}` : `a partir das ${f.inicio}`))
      .join(', ');
  }

  /** === Fallback: trata como período do dia atual === */

  /** === Utils: agora retorna múltiplos dias e trata sinônimos === */
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

    const p = norm(periodo);

    // Períodos compostos: fim/final de semana, fds, etc. → sábado e domingo
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

    // Referenciais: só aplicam a hoje / amanhã / depois de amanhã
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
      // se marcou referencial mas não é um desses → cai no literal abaixo
    }

    // Literal: dias exatos da semana
    const idx = dias.findIndex((d) => norm(d) === p);
    if (idx >= 0) return { diasIdx: [idx], labels: [dias[idx]] };

    // Fallback: usa hoje
    const i = hoje.getDay();
    return { diasIdx: [i], labels: [dias[i]] };
  }

  private capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
