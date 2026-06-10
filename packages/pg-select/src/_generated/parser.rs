// Auto-generated from packages/pg-select/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (rust backend — see packages/compiler/src/emit/rust/)
#![allow(dead_code, unused_variables, non_snake_case, clippy::all)]

use std::fmt;

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Array(Vec<Value>),
    Object(Vec<(String, Value)>),
}

impl Value {
    pub fn obj_get(&self, key: &str) -> Option<&Value> {
        if let Value::Object(fields) = self {
            for (k, v) in fields {
                if k == key {
                    return Some(v);
                }
            }
        }
        None
    }
}

impl fmt::Display for Value {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Value::Null => write!(f, "null"),
            Value::Bool(b) => write!(f, "{}", b),
            Value::Number(n) => write!(f, "{}", n),
            Value::String(s) => write!(f, "\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\"")),
            Value::Array(items) => {
                write!(f, "[")?;
                for (i, item) in items.iter().enumerate() {
                    if i > 0 { write!(f, ",")?; }
                    write!(f, "{}", item)?;
                }
                write!(f, "]")
            }
            Value::Object(fields) => {
                write!(f, "{{")?;
                for (i, (k, v)) in fields.iter().enumerate() {
                    if i > 0 { write!(f, ",")?; }
                    write!(f, "\"{}\":{}", k, v)?;
                }
                write!(f, "}}")
            }
        }
    }
}

// Phase 6 -- recovery diagnostics. Productions marked .recovers({syncAt,
// drop}) push a Diagnostic on successful match; speculative rollback
// truncates the vector back to its entry-time length so a discarded
// recovery alt leaves no spurious entry. The public render() returns
// (Value, Vec<Diagnostic>) so callers can observe partial parses.
#[derive(Debug, Clone, PartialEq)]
pub struct Diagnostic {
    pub code: String,
    pub drop: String,
    pub start: usize,
    pub end: usize,
}

struct State<'a> {
    input: &'a [u8],
    src: &'a str,
    pos: usize,
    max_pos: usize,
    diagnostics: Vec<Diagnostic>,
}

impl<'a> State<'a> {
    fn new(src: &'a str) -> Self {
        Self {
            input: src.as_bytes(),
            src,
            pos: 0,
            max_pos: 0,
            diagnostics: Vec::new(),
        }
    }
}

fn skip_ws(state: &mut State) {
    while state.pos < state.input.len() {
        let b = state.input[state.pos];
        if b == b' ' || b == b'\t' || b == b'\n' || b == b'\r' {
            state.pos += 1;
        } else {
            break;
        }
    }
}

// Phase 6 -- comment-class support. Scans block comments delimited by
// slash-star and star-slash. Returns true and advances state.pos past
// the closing delimiter on hit; returns false without advancing on
// miss. Unterminated comments (no closing delimiter before EOF) consume
// to EOF and return true -- mirrors the v2 emit's commentSkip behavior
// so byte-level positions stay in lockstep across backends.
fn match_block_comment(state: &mut State) -> bool {
    if state.pos + 1 < state.input.len()
        && state.input[state.pos] == b'/'
        && state.input[state.pos + 1] == b'*'
    {
        state.pos += 2;
        while state.pos < state.input.len() {
            if state.input[state.pos] == b'*'
                && state.pos + 1 < state.input.len()
                && state.input[state.pos + 1] == b'/'
            {
                state.pos += 2;
                return true;
            }
            state.pos += 1;
        }
        return true;
    }
    false
}

fn skip_ws_and_comments(state: &mut State) {
    loop {
        let before = state.pos;
        while state.pos < state.input.len() {
            let b = state.input[state.pos];
            if b == b' ' || b == b'\t' || b == b'\n' || b == b'\r' {
                state.pos += 1;
            } else {
                break;
            }
        }
        if !match_block_comment(state) {
            if state.pos == before { break; }
            // We consumed only ws this pass; nothing more to do.
            break;
        }
        // We consumed a comment; loop to eat any following ws / comments.
    }
}

fn is_ident_start(b: u8) -> bool {
    (b >= b'a' && b <= b'z') || (b >= b'A' && b <= b'Z') || b == b'_'
}

fn is_ident_cont(b: u8) -> bool {
    is_ident_start(b) || (b >= b'0' && b <= b'9') || b == b'-'
}

fn is_digit(b: u8) -> bool {
    b >= b'0' && b <= b'9'
}

fn opt_str(s: &Option<String>) -> Value {
    match s {
        Some(v) => Value::String(v.clone()),
        None => Value::Null,
    }
}

fn opt_value(v: &Option<Value>) -> Value {
    match v {
        Some(v) => v.clone(),
        None => Value::Null,
    }
}

fn match_literal(state: &mut State, lit: &str) -> bool {
    let bytes = lit.as_bytes();
    let end = state.pos + bytes.len();
    if end > state.input.len() {
        return false;
    }
    if &state.input[state.pos..end] != bytes {
        return false;
    }
    state.pos = end;
    true
}

fn syntax_error(state: &State) -> String {
    let pos = state.max_pos.max(state.pos);
    format!("parse error at byte offset {}", pos)
}

fn parse_ColumnRef__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "*") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("wildcard".to_string()))]))
}

fn parse_ColumnRef__alt1(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __name_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __name_end = state.pos;
    let name: String = state.src[__name_start..__name_end].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("column".to_string())), ("name".to_string(), Value::String(name.clone()))]))
}

fn parse_ColumnRef(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_ColumnRef__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_ColumnRef__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_ColumnRef__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "wildcard" => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    let mut __out = String::new();
    __out.push_str("*");
    Some(__out)
}

fn stringify_ColumnRef__alt1(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "column" => (), _ => return None }
    let name: Option<&Value> = __value.obj_get("name");
    let __s0: String = if let Some(Value::String(s)) = name { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_ColumnRef(value: &Value) -> String {
    if let Some(out) = stringify_ColumnRef__alt0(value) { return out; }
    if let Some(out) = stringify_ColumnRef__alt1(value) { return out; }
    String::new()
}

fn parse_LiteralValue__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __value_start = state.pos;
    if state.pos >= state.input.len() || !(is_digit(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_digit(state.input[state.pos])) {
        state.pos += 1;
    }
    let __value_end = state.pos;
    let value: String = state.src[__value_start..__value_end].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("number".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_LiteralValue__alt1(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __value_start = state.pos;
    if state.pos >= state.input.len() || state.input[state.pos] != b'\'' {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() {
        let b = state.input[state.pos];
        if b == b'\\' && state.pos + 1 < state.input.len() {
            state.pos += 2;
            continue;
        }
        if b == b'\'' {
            state.pos += 1;
            break;
        }
        state.pos += 1;
    }
    let __value_end = state.pos;
    let value: String = state.src[__value_start..__value_end].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("string".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_LiteralValue(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_LiteralValue__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_LiteralValue__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_LiteralValue__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "number" => (), _ => return None }
    let value: Option<&Value> = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_LiteralValue__alt1(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "string" => (), _ => return None }
    let value: Option<&Value> = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_LiteralValue(value: &Value) -> String {
    if let Some(out) = stringify_LiteralValue__alt0(value) { return out; }
    if let Some(out) = stringify_LiteralValue__alt1(value) { return out; }
    String::new()
}

fn parse_Predicate__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let col: Value = match parse_ColumnRef(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    skip_ws(state);
    let __op_start = state.pos;
    if !(state.pos < state.input.len() && (state.input[state.pos..].starts_with("!=".as_bytes()) || state.input[state.pos..].starts_with("<=".as_bytes()) || state.input[state.pos..].starts_with(">=".as_bytes()) || state.input[state.pos..].starts_with("<".as_bytes()) || state.input[state.pos..].starts_with("=".as_bytes()) || state.input[state.pos..].starts_with(">".as_bytes()))) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
        if state.input[state.pos..].starts_with("!=".as_bytes()) { state.pos += 2; }
        else if state.input[state.pos..].starts_with("<=".as_bytes()) { state.pos += 2; }
        else if state.input[state.pos..].starts_with(">=".as_bytes()) { state.pos += 2; }
        else if state.input[state.pos..].starts_with("<".as_bytes()) { state.pos += 1; }
        else if state.input[state.pos..].starts_with("=".as_bytes()) { state.pos += 1; }
        else if state.input[state.pos..].starts_with(">".as_bytes()) { state.pos += 1; }
    let __op_end = state.pos;
    let op: String = state.src[__op_start..__op_end].to_string();
    skip_ws(state);
    let val: Value = match parse_LiteralValue(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    Some(Value::Object(vec![("type".to_string(), Value::String("predicate".to_string())), ("col".to_string(), col.clone()), ("op".to_string(), Value::String(op.clone())), ("val".to_string(), val.clone())]))
}

fn parse_Predicate(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_Predicate__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_Predicate__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "predicate" => (), _ => return None }
    let col: Option<&Value> = __value.obj_get("col");
    let op: Option<&Value> = __value.obj_get("op");
    let val: Option<&Value> = __value.obj_get("val");
    let __s0: String = if let Some(inner) = col { stringify_ColumnRef(inner) } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = op { s.clone() } else { String::new() };
    let __s2: String = if let Some(inner) = val { stringify_LiteralValue(inner) } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str(" ");
    __out.push_str(&__s1);
    __out.push_str(" ");
    __out.push_str(&__s2);
    Some(__out)
}

fn stringify_Predicate(value: &Value) -> String {
    if let Some(out) = stringify_Predicate__alt0(value) { return out; }
    String::new()
}

fn parse_Select__alt0(state: &mut State, entry_pos: usize, columns: Vec<Value>, table: String) -> Option<Value> {
    Some(Value::Object(vec![("type".to_string(), Value::String("select".to_string())), ("columns".to_string(), Value::Array(columns.clone())), ("table".to_string(), Value::String(table.clone()))]))
}

fn parse_Select__alt1(state: &mut State, entry_pos: usize, columns: Vec<Value>, table: String) -> Option<Value> {
    skip_ws(state);
    if !match_literal(state, "WHERE") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let r#where: Value = match parse_Predicate(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    Some(Value::Object(vec![("type".to_string(), Value::String("select".to_string())), ("columns".to_string(), Value::Array(columns.clone())), ("table".to_string(), Value::String(table.clone())), ("where".to_string(), r#where.clone())]))
}

fn parse_Select__alt2(state: &mut State, entry_pos: usize, columns: Vec<Value>, table: String) -> Option<Value> {
    skip_ws(state);
    if !match_literal(state, "LIMIT") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __limit_start = state.pos;
    if state.pos >= state.input.len() || !(is_digit(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_digit(state.input[state.pos])) {
        state.pos += 1;
    }
    let __limit_end = state.pos;
    let limit: String = state.src[__limit_start..__limit_end].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("select".to_string())), ("columns".to_string(), Value::Array(columns.clone())), ("table".to_string(), Value::String(table.clone())), ("limit".to_string(), Value::String(limit.clone()))]))
}

fn parse_Select__alt3(state: &mut State, entry_pos: usize, columns: Vec<Value>, table: String) -> Option<Value> {
    skip_ws(state);
    if !match_literal(state, "WHERE") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let r#where: Value = match parse_Predicate(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    skip_ws(state);
    if !match_literal(state, "LIMIT") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __limit_start = state.pos;
    if state.pos >= state.input.len() || !(is_digit(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_digit(state.input[state.pos])) {
        state.pos += 1;
    }
    let __limit_end = state.pos;
    let limit: String = state.src[__limit_start..__limit_end].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("select".to_string())), ("columns".to_string(), Value::Array(columns.clone())), ("table".to_string(), Value::String(table.clone())), ("where".to_string(), r#where.clone()), ("limit".to_string(), Value::String(limit.clone()))]))
}

fn parse_Select(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    skip_ws(state);
    if !match_literal(state, "SELECT") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut columns: Vec<Value> = Vec::new();
    let mut __sep_consumed = false;
    let mut __pre_sweep = state.pos;
    loop {
        let __loop_start = state.pos;
        __pre_sweep = state.pos;
        __sep_consumed = false;
        skip_ws(state);
        while match_literal(state, ",") {
            __sep_consumed = true;
            skip_ws(state);
        }
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 70 && (state.input[state.pos..].starts_with("FROM".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item = parse_ColumnRef(state);
        match __item {
            Some(v) => {
                if state.pos == __iter_snapshot {
                    state.pos = __pre_sweep;
                    break;
                }
                columns.push(v);
            }
            None => {
                state.pos = __pre_sweep;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    if columns.len() < 1 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "FROM") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __table_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __table_end = state.pos;
    let table: String = state.src[__table_start..__table_end].to_string();
    let __post_pos = state.pos;
    let mut __peek = state.pos;
    while __peek < state.input.len() {
        let b = state.input[__peek];
        if b == b' ' || b == b'\t' || b == b'\n' || b == b'\r' { __peek += 1; continue; }
        break;
    }
    if __peek <= state.input.len() && state.input[__peek..].starts_with(b"WHERE") {
        state.pos = __post_pos;
        if let Some(v) = parse_Select__alt3(state, entry_pos, columns.clone(), table.clone()) { return Some(v); }
        state.pos = __post_pos;
        if let Some(v) = parse_Select__alt1(state, entry_pos, columns.clone(), table.clone()) { return Some(v); }
    }
    if __peek <= state.input.len() && state.input[__peek..].starts_with(b"LIMIT") {
        state.pos = __post_pos;
        if let Some(v) = parse_Select__alt2(state, entry_pos, columns.clone(), table.clone()) { return Some(v); }
    }
    state.pos = __post_pos;
    parse_Select__alt0(state, entry_pos, columns, table)
}

fn stringify_Select__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "select" => (), _ => return None }
    match __value.obj_get("where") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("limit") { None | Some(Value::Null) => (), _ => return None }
    let columns: Option<&Value> = __value.obj_get("columns");
    let table: Option<&Value> = __value.obj_get("table");
    let __s0: String = if let Some(Value::Array(items)) = columns { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(","); } __t.push_str(&stringify_ColumnRef(item)); } __t } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = table { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("SELECT ");
    __out.push_str(&__s0);
    __out.push_str(" FROM ");
    __out.push_str(&__s1);
    Some(__out)
}

fn stringify_Select__alt1(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "select" => (), _ => return None }
    match __value.obj_get("limit") { None | Some(Value::Null) => (), _ => return None }
    let columns: Option<&Value> = __value.obj_get("columns");
    let table: Option<&Value> = __value.obj_get("table");
    let r#where: Option<&Value> = __value.obj_get("where");
    let __s0: String = if let Some(Value::Array(items)) = columns { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(","); } __t.push_str(&stringify_ColumnRef(item)); } __t } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = table { s.clone() } else { String::new() };
    let __s2: String = if let Some(inner) = r#where { stringify_Predicate(inner) } else { String::new() };
    let mut __out = String::new();
    __out.push_str("SELECT ");
    __out.push_str(&__s0);
    __out.push_str(" FROM ");
    __out.push_str(&__s1);
    __out.push_str(" WHERE ");
    __out.push_str(&__s2);
    Some(__out)
}

fn stringify_Select__alt2(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "select" => (), _ => return None }
    match __value.obj_get("where") { None | Some(Value::Null) => (), _ => return None }
    let columns: Option<&Value> = __value.obj_get("columns");
    let table: Option<&Value> = __value.obj_get("table");
    let limit: Option<&Value> = __value.obj_get("limit");
    let __s0: String = if let Some(Value::Array(items)) = columns { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(","); } __t.push_str(&stringify_ColumnRef(item)); } __t } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = table { s.clone() } else { String::new() };
    let __s2: String = if let Some(Value::String(s)) = limit { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("SELECT ");
    __out.push_str(&__s0);
    __out.push_str(" FROM ");
    __out.push_str(&__s1);
    __out.push_str(" LIMIT ");
    __out.push_str(&__s2);
    Some(__out)
}

fn stringify_Select__alt3(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "select" => (), _ => return None }
    let columns: Option<&Value> = __value.obj_get("columns");
    let table: Option<&Value> = __value.obj_get("table");
    let r#where: Option<&Value> = __value.obj_get("where");
    let limit: Option<&Value> = __value.obj_get("limit");
    let __s0: String = if let Some(Value::Array(items)) = columns { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(","); } __t.push_str(&stringify_ColumnRef(item)); } __t } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = table { s.clone() } else { String::new() };
    let __s2: String = if let Some(inner) = r#where { stringify_Predicate(inner) } else { String::new() };
    let __s3: String = if let Some(Value::String(s)) = limit { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("SELECT ");
    __out.push_str(&__s0);
    __out.push_str(" FROM ");
    __out.push_str(&__s1);
    __out.push_str(" WHERE ");
    __out.push_str(&__s2);
    __out.push_str(" LIMIT ");
    __out.push_str(&__s3);
    Some(__out)
}

fn stringify_Select(value: &Value) -> String {
    if let Some(out) = stringify_Select__alt0(value) { return out; }
    if let Some(out) = stringify_Select__alt1(value) { return out; }
    if let Some(out) = stringify_Select__alt2(value) { return out; }
    if let Some(out) = stringify_Select__alt3(value) { return out; }
    String::new()
}

pub fn render(input: &str) -> Result<Value, String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_Select(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok(result)
}
pub fn render_with_diagnostics(input: &str) -> Result<(Value, Vec<Diagnostic>), String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_Select(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok((result, state.diagnostics))
}

pub fn stringify(value: &Value) -> String {
    stringify_Select(value)
}

#[cfg(target_arch = "wasm32")]
mod __wasm_exports {
    use super::*;

    // Result-buffer slot. We keep ONE buffer live at a time; the host
    // is expected to call parser_render OR parser_stringify, then read
    // parser_result_ptr() + the returned length, before the next call.
    // Mutating a static is safe in single-threaded wasm32; wrap in a
    // dedicated cell so the borrow checker stays out of the way.
    static mut LAST_RESULT: Vec<u8> = Vec::new();

    #[no_mangle]
    pub extern "C" fn parser_alloc(size: usize) -> *mut u8 {
        let mut buf: Vec<u8> = Vec::with_capacity(size);
        let ptr = buf.as_mut_ptr();
        core::mem::forget(buf);
        ptr
    }

    #[no_mangle]
    pub unsafe extern "C" fn parser_dealloc(ptr: *mut u8, size: usize) {
        // Reclaim via Vec::from_raw_parts; capacity == size by
        // construction in parser_alloc.
        let _ = Vec::from_raw_parts(ptr, size, size);
    }

    #[no_mangle]
    pub unsafe extern "C" fn parser_render(in_ptr: *const u8, in_len: usize) -> usize {
        let bytes = core::slice::from_raw_parts(in_ptr, in_len);
        let input = match core::str::from_utf8(bytes) {
            Ok(s) => s,
            Err(_) => {
                LAST_RESULT = b"ERR:non-utf8 input".to_vec();
                return LAST_RESULT.len();
            }
        };
        let out = match render(input) {
            Ok(v) => format!("{}", v),
            Err(e) => format!("ERR:{}", e),
        };
        LAST_RESULT = out.into_bytes();
        LAST_RESULT.len()
    }

    #[no_mangle]
    pub unsafe extern "C" fn parser_stringify(in_ptr: *const u8, in_len: usize) -> usize {
        // The wasm host hands us a canonical render output (the same
        // bytes parser_render emitted). Round-tripping it requires
        // first deserializing to Value; full JSON-style parsing of
        // the Display form is out of scope for this thin shim — for
        // now we expose a stringify that takes the raw input and
        // parses + re-stringifies in one call, which is the common
        // "format / normalize" workflow.
        let bytes = core::slice::from_raw_parts(in_ptr, in_len);
        let input = match core::str::from_utf8(bytes) {
            Ok(s) => s,
            Err(_) => {
                LAST_RESULT = b"ERR:non-utf8 input".to_vec();
                return LAST_RESULT.len();
            }
        };
        let out = match render(input) {
            Ok(v) => stringify(&v),
            Err(e) => format!("ERR:{}", e),
        };
        LAST_RESULT = out.into_bytes();
        LAST_RESULT.len()
    }

    #[no_mangle]
    pub extern "C" fn parser_result_ptr() -> *const u8 {
        unsafe { LAST_RESULT.as_ptr() }
    }
}
