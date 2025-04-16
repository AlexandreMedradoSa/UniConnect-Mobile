export interface UserProfile {
  id: string;
  name: string;
  email: string;
  curso: string;
  semestre: number;
  interesses: string[];
}

export interface Group {
  id: number;
  nome: string;
  descricao: string;
  curso: string;
  semestre: number;
  interesses: string[];
  criador_id: string;
  criado_em: string;
  status: string;
  notas: string | null;
}

export interface Connection {
  conexaoId: string;
  id: string;
  name: string;
  curso: string;
  semestre: number;
  interesses: string[];
}

export interface ConnectionRequest {
  id: string;
  name: string;
  curso: string;
  semestre: number;
  interesses: string[];
  status: 'pendente' | 'aceito' | 'recusado';
  data: string;
}

export interface Event {
  id: number;
  nome: string;
  descricao: string;
  data: string;
  curso: string;
  limite_participantes: number;
  localizacao: string;
  observacoes_adicionais: string;
  criador_id: string;
  evento_participantes: { usuario_id: string }[];
  total_participantes: number;
}
