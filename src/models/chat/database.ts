import { DataSource } from 'typeorm';
import { InformacoesEntity } from './entities/Informacoes.entity';

type Faixa = { inicio: string; fim?: string };

interface HorariosDeFuncionamento {
  nome: DiasDaSemana;
  horarios: Faixa[];
  estaAberto?: boolean;
  options?: string[];
}
enum DiasDaSemana {
  SEGUNDA = 'segunda',
  TERCA = 'terça',
  QUARTA = 'quarta',
  QUINTA = 'quinta',
  SEXTA = 'sexta',
  SABADO = 'sábado',
  DOMINGO = 'domingo',
}
interface Programacao {
  nomes: string[];
  horarios: HorariosDeFuncionamento[];
  descricao: string;
  limitado?: boolean;
}
interface Informacoes {
  nomes: string[];
  observacoes: string[];
}

const BUSINESS_TZ = process.env.BUSINESS_TZ || 'America/Sao_Paulo';

export const horariosDeFuncionamento: HorariosDeFuncionamento[] = [
  { nome: DiasDaSemana.SEGUNDA, horarios: [{ inicio: '12:00', fim: '16:00' }] },
  { nome: DiasDaSemana.TERCA, horarios: [{ inicio: '12:00', fim: '16:00' }] },
  {
    nome: DiasDaSemana.QUARTA,
    horarios: [
      { inicio: '12:00', fim: '16:00' },
      { inicio: '18:00', fim: '23:00' },
    ],
  },
  { nome: DiasDaSemana.QUINTA, horarios: [{ inicio: '12:00', fim: '23:00' }] },
  { nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '12:00', fim: '23:00' }] },
  { nome: DiasDaSemana.SABADO, horarios: [{ inicio: '10:00', fim: '23:00' }] },
  { nome: DiasDaSemana.DOMINGO, horarios: [{ inicio: '10:00', fim: '18:00' }] },
];

export const programacao: Programacao[] = [
  {
    nomes: ['executivo', 'menu executivo'],
    horarios: [
      {
        nome: DiasDaSemana.SEGUNDA,
        horarios: [{ inicio: '12:00', fim: '16:00' }],
      },
      {
        nome: DiasDaSemana.TERCA,
        horarios: [{ inicio: '12:00', fim: '16:00' }],
      },
      {
        nome: DiasDaSemana.QUARTA,
        horarios: [{ inicio: '12:00', fim: '16:00' }],
      },
      {
        nome: DiasDaSemana.QUINTA,
        horarios: [{ inicio: '12:00', fim: '16:00' }],
      },
      {
        nome: DiasDaSemana.SEXTA,
        horarios: [{ inicio: '12:00', fim: '16:00' }],
      },
    ],
    descricao:
      'Duas opções de executivo: (1) escolha 1 carne, 1 acompanhamento e 1 molho; (2) entrada + principal + sobremesa, com novidades quinzenais.',
  },
  {
    nomes: ['cafe', 'café da manhã'],
    horarios: [
      {
        nome: DiasDaSemana.SABADO,
        horarios: [{ inicio: '10:00', fim: '13:00' }],
      },
      {
        nome: DiasDaSemana.DOMINGO,
        horarios: [{ inicio: '10:00', fim: '13:00' }],
      },
    ],
    descricao:
      'Menu completo com pães, frutas, bolos e bebidas quentes. Opções veganas e vegetarianas. Combos e à la carte.',
  },
  {
    nomes: ['jantar'],
    horarios: [
      {
        nome: DiasDaSemana.QUARTA,
        horarios: [{ inicio: '18:00', fim: '23:00' }],
      },
      {
        nome: DiasDaSemana.QUINTA,
        horarios: [{ inicio: '18:00', fim: '23:00' }],
      },
      {
        nome: DiasDaSemana.SEXTA,
        horarios: [{ inicio: '18:00', fim: '23:00' }],
      },
      {
        nome: DiasDaSemana.SABADO,
        horarios: [{ inicio: '18:00', fim: '23:00' }],
      },
    ],
    descricao:
      'Pratos quentes, saladas e sobremesas — perfeito para fechar o dia.',
  },
  {
    nomes: ['menu completo', 'cardapio completo'],
    horarios: [
      { nome: DiasDaSemana.SEGUNDA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.TERCA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.QUARTA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.QUINTA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.SABADO, horarios: [{ inicio: '13:00' }] },
      { nome: DiasDaSemana.DOMINGO, horarios: [{ inicio: '13:00' }] },
    ],
    descricao: '',
  },
  {
    nomes: ['fondue', 'foundue da casa', 'foundue da gloria'],
    limitado: true,
    horarios: [
      { nome: DiasDaSemana.QUARTA, horarios: [{ inicio: '19:00' }] },
      { nome: DiasDaSemana.QUINTA, horarios: [{ inicio: '19:00' }] },
      { nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '19:00' }] },
      { nome: DiasDaSemana.SABADO, horarios: [{ inicio: '19:00' }] },
    ],
    descricao:
      'Experiência de fondue com opções de queijo, queijo trufado, queijo vegano, carne e chocolate. Todas as opções servem duas pessoas. Por tempo limitado.',
  },
  {
    nomes: [
      'musica ao vivo',
      'musica instrumental',
      'musica instrumental ao vivo',
    ],
    horarios: [{ nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '19:00' }] }],
    descricao: 'Música ao vivo instrumental todas as sextas a partir das 19h.',
  },
];

export const informacoes: Informacoes[] = [
  {
    nomes: ['cardapio', 'valores'],
    observacoes: [
      'Nossos cardápios e valores estão em: https://linktr.ee/bitrodacasa',
    ],
  },
  {
    nomes: ['endereco'],
    observacoes: [
      'Endereço: Ladeira da Glória, 98, Glória, Rio de Janeiro - RJ',
    ],
  },
  {
    nomes: [
      'eventos particulares',
      'casamentos',
      'festas de 15 anos',
      'eventos corporativos',
    ],
    observacoes: [
      'Realizamos eventos! Para orçamento: contato@casadagloria.com.br',
    ],
  },
  {
    nomes: ['reservas'],
    observacoes: [
      'Reserve em: https://linktr.ee/bitrodacasa → “Reserva online”.',
      'Se não aparecer data no sistema, é porque não há disponibilidade.',
      'Atendemos sem reserva também, mas a disponibilidade pode ser limitada.',
    ],
  },
  {
    nomes: ['estacionamento'],
    observacoes: ['Temos estacionamento no local, normalmente há vagas.'],
  },
  {
    nomes: ['como chegar'],
    observacoes: [
      'Metrô: estação Glória + 10 minutos a pé.',
      'Também encontra nos apps buscando por “Bistrô da Casa”.',
    ],
  },
  {
    nomes: [
      'formas de pagamento',
      'tipos de pagamento',
      'voces aceitam {cartao}',
    ],
    observacoes: [
      'Aceitamos American Express, Diners, Hipercard, Mastercard, Visa, Elo (crédito/debito), Ticket Refeição e Sodexo. O único cartão que não aceitamos ainda é o Alelo.',
    ],
  },
  {
    nomes: [
      'aniversario',
      'aniversário',
      'bolo',
      'taxa de bolo',
      'comemoração',
    ],
    observacoes: [
      'Sobremesa cortesia para o aniversariante — avise ao garçom 🥳.',
      'Taxa de bolo: terça a quinta NÃO cobramos; sexta a domingo: R$50.',
      'WhatsApp para combinar: http://wa.me/5521965855546',
    ],
  },
  {
    nomes: [
      'pet',
      'pet friendly',
      'cachorro',
      'gato',
      'animal de estimacao',
      'animal de estimação',
    ],
    observacoes: ['Somos pet friendly! Mantenha seu pet sempre na guia. 🐶🐱'],
  },
  {
    nomes: [
      'feedback',
      'reclamacao',
      'reclamação',
      'elogio',
      'sugestao',
      'sugestão',
      'avaliacao',
      'avaliação',
    ],
    observacoes: [
      'Conte pra gente sua experiência! Estamos sempre melhorando 💙',
    ],
  },
  {
    nomes: ['reserva esgotada', 'sem vagas', 'lotado', 'sem disponibilidade'],
    observacoes: [
      'Se o sistema não mostra horários/datas, é porque não há disponibilidade.',
      'Chame no WhatsApp para checar desistências: 21 96585-5546.',
      'Reservas/infos: https://linktr.ee/bistrodacasa',
    ],
  },
  {
    nomes: ['rolha', 'taxa de rolha', 'vinho', 'levar vinho'],
    observacoes: [
      'Sem taxa de rolha: terça a quinta.',
      'Sexta a domingo: taxa de rolha R$40.',
      'Temos carta de vinhos especial 🍷.',
    ],
  },
  {
    nomes: [
      'comida vegetarina',
      'comida vegana',
      'opções vegetarianas',
      'opcoes veganas',
      'vegetariana',
      'vegana',
    ],
    observacoes: [
      'Temos opções vegetarianas e veganas e voce pode conferir todas no nosso cardápio digital que fica no nosso site',
      'Para conferir as opções veganas ou vegetarianas, basta acessar o link e ir em cardápio digital',
    ],
  },
];

export async function seedInformacoes(dataSource: DataSource) {
  const repo = dataSource.getRepository(InformacoesEntity);

  // horários
  await repo.save({
    kind: 'horarios',
    data: horariosDeFuncionamento,
    version: 1,
  });

  // programação
  await repo.save({
    kind: 'programacao',
    data: programacao,
    version: 1,
  });

  // informações
  await repo.save({
    kind: 'informacoes',
    data: informacoes,
    version: 1,
  });

  console.log('✅ Base inicial populada!');
}
