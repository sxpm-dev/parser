import type {
  GeneratedValidator,
  SchemaDef,
  ValidationDef,
  ValidationRuleDef,
  ValidatorRef,
} from './types.ts';

function isSchemaDef(value: unknown): value is SchemaDef {
  return typeof value === 'object' && value !== null
    && typeof (value as { rootType?: unknown }).rootType === 'string'
    && Array.isArray((value as { examples?: unknown }).examples);
}

type MatchValue = string | ReadonlyArray<string>;

type DraftRule = {
  nodeType: string;
  field?: string;
  matchField?: string;
  matchValues?: ReadonlyArray<string>;
};

export function defineValidation(schema: SchemaDef): ValidationBuilder {
  return new ValidationBuilder(schema);
}

export class ValidationBuilder {
  readonly rules: ValidationRuleDef[] = [];
  private draft: DraftRule | null = null;

  constructor(readonly schema: SchemaDef) {}

  node(nodeType: string): this {
    this.finishDraft();
    this.draft = { nodeType };
    return this;
  }

  field(field: string): this {
    this.requireDraft().field = field;
    return this;
  }

  match(matchField: string, values: MatchValue): this {
    const normalized = Array.isArray(values) ? values : [values];
    if (normalized.some((value) => typeof value !== 'string')) {
      throw new TypeError('defineValidation.match: expected string or string[]');
    }
    this.requireDraft().matchField = matchField;
    this.requireDraft().matchValues = [...normalized];
    return this;
  }

  validate(validator: GeneratedValidator | SchemaDef): this {
    const draft = this.requireDraft();
    if (!draft.field) throw new TypeError('defineValidation.validate: missing field(...)');
    if (!draft.matchField || !draft.matchValues) {
      throw new TypeError('defineValidation.validate: missing match(...)');
    }
    let ref: ValidatorRef;
    if (isSchemaDef(validator)) {
      ref = { kind: 'inline', schema: validator };
    } else {
      const importMeta = (validator as GeneratedValidator).__parser2Validator;
      if (!importMeta) {
        throw new TypeError('defineValidation.validate: validator must be a SchemaDef or a generated validate export');
      }
      ref = { kind: 'import', module: importMeta.module, exportName: importMeta.exportName };
    }
    this.rules.push({
      nodeType: draft.nodeType,
      field: draft.field,
      matchField: draft.matchField,
      matchValues: draft.matchValues,
      validator: ref,
    });
    this.draft = null;
    return this;
  }

  build(): ValidationDef {
    this.finishDraft();
    return { schema: this.schema, rules: this.rules };
  }

  private requireDraft(): DraftRule {
    if (!this.draft) throw new TypeError('defineValidation: call node(...) first');
    return this.draft;
  }

  private finishDraft(): void {
    if (!this.draft) return;
    throw new TypeError('defineValidation: incomplete validation rule');
  }
}
