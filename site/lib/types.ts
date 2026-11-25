// Shapes on the wire (vote.md contract, /v1/scores) and in the repo (catalog.json, setups.json).

export type Usage = "daily" | "weekly" | "monthly" | "installed";
export type Kind = "tool" | "skill" | "plugin" | "data";

export type VoteTool = { slug: string; usage: Usage };
export type Proposal = { name: string; url: string; description: string; category: string; usage: Usage; kind?: Kind; install?: string };

// POST /v1/vote body after validation. The raw body is untrusted JSON.
export type Vote = {
  install_id: string;
  agent: string;
  email: string | null;
  weekly_drop: boolean;
  tools: VoteTool[];
  proposals: Proposal[];
};

// What a votes row's payload column holds.
export type VotePayload = Pick<Vote, "tools" | "proposals">;
export type VoteRow = { updated_at: number; payload: VotePayload };

export type ScoredProposal = Omit<Proposal, "usage"> & { score: number; voters: number };

// GET /v1/scores
export type Scores = {
  updated: string;
  voters: number;
  tools: Record<string, { score: number; voters: number }>;
  setups: Record<string, { voters: number }>;
  proposals: ScoredProposal[];
};

// A setup the voter touches, in the POST /v1/vote reply.
export type SetupMatch = { slug: string; job: string; have: number; of: number; missing: string[] };

// POST /v1/vote 200 reply
export type VoteReply = {
  ok: true;
  counted: { tools: number; proposals: number };
  subscribed: boolean;
  new: boolean;
  voters: number;
  ranks: { slug: string; rank: number }[];
  setups: SetupMatch[];
};

// catalog.json products[]
export type Product = {
  slug: string;
  name: string;
  url: string;
  description: string;
  category: string;
  kind?: Kind;
  mcp_url?: string;
  docs_url?: string;
  maker_x?: string;
};

// setups.json setups[], after validSetups
export type Setup = { slug: string; job: string; steps: { tool: string; why: string }[] };
