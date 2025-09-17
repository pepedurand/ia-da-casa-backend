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

export const horariosDeFuncionamento: HorariosDeFuncionamento[] = [
  { nome: DiasDaSemana.SEGUNDA, horarios: [{ inicio: '12:00', fim: '16:00' }] },
  { nome: DiasDaSemana.TERCA, horarios: [{ inicio: '12:00', fim: '16:00' }] },
  {
    nome: DiasDaSemana.QUARTA,
    horarios: [
      { inicio: '12:00', fim: '15:00' },
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
    nomes: ['executivo'],
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
      'Duas opções de executivo: (1) escolha 1 carne, 1 acompanhamento e 1 molho; (2) entrada + principal + sobremesa, com novidades quinzenais. Porções individuais com ótima relação custo-benefício.',
  },
  {
    nomes: [
      'cafe',
      'café da manhã',
      'cafe da manha',
      'café',
      'breakfast',
      'brunch',
    ],
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
      'Menu da manhã com pães, frutas, bolos e bebidas quentes. Opções veganas e vegetarianas. Combos e à la carte — ideal para começar o dia em boa companhia.',
  },
  {
    nomes: [
      'jantar',
      'dinner',
      'serviço noturno',
      'servico noturno',
      'à noite',
      'a noite',
      'noite',
    ],
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
      'Seleção à la carte com pratos quentes, saladas e sobremesas. Ambiente acolhedor para celebrar e fechar o dia com calma.',
  },
  {
    nomes: [
      'cardápio',
      'cardapio',
      'menu',
      'carta',
      'menu completo',
      'cardapio completo',
      'cardápio completo',
      'menu principal',
      'menu regular',
      'menu à la carte',
      'menu a la carte',
    ],
    horarios: [
      { nome: DiasDaSemana.SEGUNDA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.TERCA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.QUARTA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.QUINTA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '12:00' }] },
      { nome: DiasDaSemana.SABADO, horarios: [{ inicio: '13:00' }] },
      { nome: DiasDaSemana.DOMINGO, horarios: [{ inicio: '13:00' }] },
    ],
    descricao:
      'Cardápio à la carte com entradas, principais e sobremesas. Itens podem variar conforme a disponibilidade de ingredientes.',
  },
  // {
  //   nomes: [
  //     'fondue',
  //     'foundue da casa',
  //     'foundue da gloria',
  //     'foundue',
  //     'fondue da casa',
  //     'fondue da glória',
  //     'noite do fondue',
  //     'rodada de fondue',
  //   ],
  //   limitado: true,
  //   horarios: [
  //     { nome: DiasDaSemana.QUARTA, horarios: [{ inicio: '19:00' }] },
  //     { nome: DiasDaSemana.QUINTA, horarios: [{ inicio: '19:00' }] },
  //     { nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '19:00' }] },
  //     { nome: DiasDaSemana.SABADO, horarios: [{ inicio: '19:00' }] },
  //   ],
  //   descricao:
  //     'Experiência de fondue com opções de queijo (tradicional e trufado), queijo vegano, carne e chocolate. Serve duas pessoas. Por tempo limitado e sujeito à disponibilidade.',
  // },
  {
    nomes: [
      'musica ao vivo',
      'música ao vivo',
      'musica instrumental',
      'música instrumental',
      'musica instrumental ao vivo',
      'música instrumental ao vivo',
      'música',
      'musica',
      'jazz ao vivo',
      'jazz',
      'som ao vivo',
      'show instrumental',
      'apresentação instrumental',
      'programação musical',
      'programacao musical',
      'agenda musical',
      'shows',
      'apresentações',
      'apresentacoes',
      'música ao vivo',
      'musica ao vivo',
      'agenda de música',
      'agenda de musica',
      'programação de shows',
      'programacao de shows',
      'cronograma musical',
      'eventos musicais',
      'quando tem música',
      'quando tem musica',
      'tem show',
      'tem música',
      'tem musica',
    ],
    horarios: [{ nome: DiasDaSemana.SEXTA, horarios: [{ inicio: '19:00' }] }],
    descricao:
      'Apresentações instrumentais às sextas a partir das 19h — trilha perfeita para o jantar.',
  },
];

export const informacoes: Informacoes[] = [
  {
    nomes: [
      'cardapio',
      'cardápio',
      'menu',
      'cardapio digital',
      'cardápio digital',
      'menu online',
      'cardapio online',
      'valores',
      'preços',
      'preco',
      'tabela de preços',
      'tabela de precos',
      'link do cardápio',
      'ver cardápio',
      'onde ver o cardápio',
      'consultar cardápio',
    ],
    observacoes: [
      'Nossos cardápios e valores estão em: https://linktr.ee/bitrodacasa',
      'Você também encontra o link do cardápio na bio do Instagram @bistrodacasa.',
      'O cardápio pode sofrer pequenas alterações conforme disponibilidade de ingredientes.',
      'Os valores podem ser atualizados periodicamente.',
    ],
  },
  {
    nomes: [
      'endereco',
      'endereço',
      'localização',
      'onde fica',
      'mapa',
      'google maps',
      'waze',
      'casa da glória',
      'casa da gloria',
      'localizacao',
      'chegar no endereço',
    ],
    observacoes: [
      'Endereço: Ladeira da Glória, 98, Glória, Rio de Janeiro - RJ',
      'Estamos dentro da Casa da Glória (entrada pela Ladeira da Glória, 98).',
      'Ao chegar, siga a sinalização interna até o Bistrô da Casa.',
    ],
  },
  {
    nomes: [
      'eventos particulares',
      'casamentos',
      'festas de 15 anos',
      'eventos corporativos',
      'eventos',
      'orçamento de evento',
      'locação de espaço',
      'celebração',
      'orcamento',
      'evento na casa',
    ],
    observacoes: [
      'Realizamos eventos! Para orçamento: contato@casadagloria.com.br',
      'Atendemos diferentes formatos de celebração — consulte a disponibilidade.',
      'Agende uma conversa para entendermos seu projeto e enviar proposta.',
    ],
  },

  {
    nomes: [
      'reservas',
      'reserva',
      'reseva',
      'reservar',
      'fazer reserva',
      'booking',
      'book',
      'agendar',
      'agendamento',
      'reservar mesa',
      'marcar mesa',
      'mesas',
      'grupos',
      'reserva para grupo',
      'reserva para grupos',
      'reserva para mais de 8',
      'grupos grandes',
      'reserva online',
    ],
    observacoes: [
      'Reserve em: https://linktr.ee/bitrodacasa → "Reserva online".',
      'Se não aparecer data no sistema, é porque não há disponibilidade.',
      'Atendemos sem reserva também, mas a disponibilidade pode ser limitada.',
      'Para grupos grandes (+8 pessoas), use "Reservas para grupos grandes" no Linktree.',
      'Sugerimos chegar alguns minutos antes do horário reservado.',
    ],
  },
  {
    nomes: [
      'estacionamento',
      'parking',
      'estacionar',
      'tem estacionamento',
      'vaga',
      'vagas',
      'estacionamento no local',
      'estacionamento da casa',
    ],
    observacoes: [
      'Temos estacionamento no local, normalmente há vagas.',
      'Sujeito à lotação do dia/evento.',
      'Verifique a sinalização no acesso interno ao chegar.',
    ],
  },
  {
    nomes: [
      'direções',
      'direcoes',
      'rota',
      'chegar',
      'ir até aí',
      'ir ate ai',
      'mapa',
      'melhor caminho',
      'transporte',
    ],
    observacoes: [
      'Metrô: estação Glória + 10 minutos a pé.',
      'Também encontra nos apps buscando por "Bistrô da Casa" ou "Casa da Glória".',
      'Táxi e apps de corrida atendem bem a região.',
    ],
  },
  {
    nomes: [
      'formas de pagamento',
      'tipos de pagamento',
      'meios de pagamento',
      'pagamento',
      'aceita cartao',
      'aceitam cartoes',
      'vale refeição',
      'vale alimentacao',
      'ticket',
      'cartões',
      'cartoes',
    ],
    observacoes: [
      'Aceitamos American Express, Diners, Hipercard, Mastercard, Visa, Elo (crédito/debito), Ticket Refeição e Sodexo. O único cartão que não aceitamos ainda é o Alelo.',
      'Traga um documento com foto para pagamentos com cartão quando solicitado.',
    ],
  },
  {
    nomes: [
      'aniversario',
      'aniversário',
      'bolo',
      'comemoração',
      'comemoracao',
      'festa de aniversário',
      'celebração',
      'trazer bolo',
      'fazer surpresa',
      'taxa de bolo',
      'cobrança de bolo',
      'cobranca de bolo',
      'custo para trazer bolo',
      'preço para trazer bolo',
      'preco para trazer bolo',
      'valor para trazer bolo',
      'taxa para bolo próprio',
      'taxa para bolo proprio',
      'aniversariante',
    ],
    observacoes: [
      'Sobremesa cortesia para o aniversariante — avise ao garçom 🥳.',
      'WhatsApp para combinar: http://wa.me/5521965855546',
      'Podemos ajudar a organizar a entrega do bolo no salão — combine com antecedência.',
      'Cobramos uma taxa de R$50 para trazer bolo próprio',
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
      'aceitam pets',
      'pets são bem-vindos',
      'pets sao bem vindos',
      'pode levar pet',
    ],
    observacoes: [
      'Somos pet friendly! Mantenha seu pet sempre na guia. 🐶🐱',
      'Leve água e saquinhos para seu pet, se possível.',
    ],
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
      'ouvidoria',
      'fale conosco',
      'contato',
      'comentário',
      'comentario',
    ],
    observacoes: [
      'Conte pra gente sua experiência! Estamos sempre melhorando 💙',
      'Sua opinião ajuda a aprimorar o serviço e o cardápio.',
    ],
  },
  {
    nomes: [
      'reserva esgotada',
      'sem vagas',
      'lotado',
      'sem disponibilidade',
      'sem horário disponível',
      'sem horarios',
      'agenda cheia',
      'sold out',
      'não aparece horário',
      'nao aparece horario',
    ],
    observacoes: [
      'Se o sistema não mostra horários/datas, é porque não há disponibilidade.',
      'Chame no WhatsApp para checar desistências: 21 96585-5546.',
      'Reservas/infos: https://linktr.ee/bistrodacasa',
      'Continue acompanhando — novas vagas podem aparecer por desistência.',
    ],
  },
  {
    nomes: [
      'rolha',
      'taxa de rolha',
      'rolha de vinho',
      'corkage',
      'corkage fee',
      'levar vinho',
      'abrir vinho',
      'vinho próprio',
      'vinho proprio',
    ],
    observacoes: [
      'Sem taxa de rolha: terça a quinta.',
      'Sexta a domingo: taxa de rolha R$40.',
      'Temos carta de vinhos especial 🍷.',
      'Traga seu saca-rolhas somente se desejar — nossa equipe pode auxiliar.',
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
      'veg',
      'veg-friendly',
      'sem carne',
      'opções sem carne',
      'opcoes sem carne',
    ],
    observacoes: [
      'Temos opções vegetarianas e veganas — confira no cardápio digital.',
      'Para ver as opções, acesse o link e selecione "Cardápio digital".',
      'Avise à equipe em caso de restrições alimentares para orientarmos melhor.',
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
  await repo.save({ kind: 'programacao', data: programacao, version: 1 });

  // informações
  await repo.save({ kind: 'informacoes', data: informacoes, version: 1 });

  console.log('✅ Base inicial populada!');
}
