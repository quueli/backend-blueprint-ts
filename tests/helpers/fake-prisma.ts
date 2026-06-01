// in-memory prisma double, only the where/orderBy shapes this package actually uses

export type Row = Record<string, any>;

function matchWhere(row: Row, where: any): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    const val = row[key];
    if (cond === null) {
      if (val !== null && val !== undefined) return false;
      continue;
    }
    if (typeof cond === 'object' && cond !== null && !(cond instanceof Date)) {
      if ('not' in cond) {
        if (cond.not === null) {
          if (val === null || val === undefined) return false;
        } else if (val === cond.not) {
          return false;
        }
        continue;
      }
      if ('in' in cond) {
        if (!cond.in.includes(val)) return false;
        continue;
      }
      if ('notIn' in cond) {
        if (cond.notIn.includes(val)) return false;
        continue;
      }
      continue; // unsupported operator → ignore
    }
    if (val !== cond) return false;
  }
  return true;
}

function compareVals(a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls sort last (asc)
  if (b == null) return -1;
  const av = a instanceof Date ? a.getTime() : a;
  const bv = b instanceof Date ? b.getTime() : b;
  return av < bv ? -1 : av > bv ? 1 : 0;
}

function makeComparator(orderBy: any) {
  const specs: any[] = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  return (a: Row, b: Row) => {
    for (const spec of specs) {
      for (const [key, dir] of Object.entries(spec)) {
        const cmp = compareVals(a[key], b[key]);
        if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  };
}

type Model = {
  count(args?: any): Promise<number>;
  findMany(args?: any): Promise<Row[]>;
  findUnique(args: any): Promise<Row | null>;
  findFirst(args?: any): Promise<Row | null>;
  create(args: any): Promise<Row>;
  update(args: any): Promise<Row>;
  updateMany(args: any): Promise<{ count: number }>;
  deleteMany(args: any): Promise<{ count: number }>;
  upsert(args: any): Promise<Row>;
  _rows(): Row[];
};

function collection(initial: Row[], defaults: (i: number) => Row): Model {
  let rows: Row[] = initial.map((r, i) => ({ ...defaults(i), ...r }));
  let created = 0;
  return {
    async count({ where }: any = {}) {
      return rows.filter((r) => matchWhere(r, where)).length;
    },
    async findMany({ where, orderBy, skip = 0, take }: any = {}) {
      let out = rows.filter((r) => matchWhere(r, where));
      if (orderBy) out = out.slice().sort(makeComparator(orderBy));
      if (skip) out = out.slice(skip);
      if (typeof take === 'number') out = out.slice(0, take);
      return out.map((r) => ({ ...r }));
    },
    async findUnique({ where }: any) {
      const r = rows.find((x) => matchWhere(x, where));
      return r ? { ...r } : null;
    },
    async findFirst({ where, orderBy }: any = {}) {
      let out = rows.filter((r) => matchWhere(r, where));
      if (orderBy) out = out.slice().sort(makeComparator(orderBy));
      return out[0] ? { ...out[0] } : null;
    },
    async create({ data }: any) {
      const row = { ...defaults(rows.length + created++), ...data };
      rows.push(row);
      return { ...row };
    },
    async update({ where, data }: any) {
      const r = rows.find((x) => matchWhere(x, where));
      if (!r) throw new Error(`row not found: ${JSON.stringify(where)}`);
      Object.assign(r, data);
      return { ...r };
    },
    async updateMany({ where, data }: any) {
      let count = 0;
      for (const r of rows) {
        if (matchWhere(r, where)) {
          Object.assign(r, data);
          count++;
        }
      }
      return { count };
    },
    async deleteMany({ where }: any) {
      const before = rows.length;
      rows = rows.filter((r) => !matchWhere(r, where));
      return { count: before - rows.length };
    },
    async upsert({ where, create, update }: any) {
      const r = rows.find((x) => matchWhere(x, where));
      if (r) {
        Object.assign(r, update);
        return { ...r };
      }
      const row = { ...defaults(rows.length + created++), ...create };
      rows.push(row);
      return { ...row };
    },
    _rows: () => rows,
  };
}

export type FakeSeeds = {
  users?: Row[];
  pageBlocks?: Row[];
  settings?: Row[];
  comments?: Row[];
  activities?: Row[];
};

export function createFakePrisma(seedLeads: Row[] = [], seeds: FakeSeeds = {}) {
  const lead = collection(seedLeads, (i) => ({
    id: `seed_${i + 1}`,
    refNo: i + 1,
    name: `Lead ${i + 1}`,
    status: 'NEW',
    tags: [],
    readAt: null,
    archivedAt: null,
    createdAt: new Date(1_700_000_000_000 + i * 1000),
  }));

  const user = collection(seeds.users ?? [], (i) => ({
    id: `user_${i + 1}`,
    email: `user${i + 1}@example.com`,
    name: `User ${i + 1}`,
    role: 'EDITOR',
    passwordHash: '',
  }));

  const pageBlock = collection(seeds.pageBlocks ?? [], () => ({
    value: {},
    draftValue: null,
    publishedValue: null,
    publishedAt: null,
  }));

  const setting = collection(seeds.settings ?? [], () => ({ value: null }));
  const comment = collection(seeds.comments ?? [], (i) => ({ id: `note_${i + 1}` }));
  const activity = collection(seeds.activities ?? [], (i) => ({ id: `act_${i + 1}` }));

  return {
    lead,
    user,
    pageBlock,
    setting,
    comment,
    activity,
    _state: {
      leads: () => lead._rows(),
      activities: activity._rows(),
      settings: setting._rows(),
    },
  };
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
