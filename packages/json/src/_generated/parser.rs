// Auto-generated from packages/json/src/schema.ts
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

// Phase 6 raws-mode (first slice). Fast = caller asked for the AST only;
// Raws = attach byte-offset source ranges to every object-shaped AST node
// so callers can light up format-preserving transforms.  Other trivia
// (inter-span ws, optional-literal presence, per-iteration ws inside
// repeats) deferred to follow-up sessions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParseMode {
    Fast,
    Raws,
}

struct State<'a> {
    input: &'a [u8],
    src: &'a str,
    pos: usize,
    max_pos: usize,
    diagnostics: Vec<Diagnostic>,
    mode: ParseMode,
}

impl<'a> State<'a> {
    fn new(src: &'a str) -> Self {
        Self {
            input: src.as_bytes(),
            src,
            pos: 0,
            max_pos: 0,
            diagnostics: Vec::new(),
            mode: ParseMode::Fast,
        }
    }
    fn new_with_mode(src: &'a str, mode: ParseMode) -> Self {
        Self {
            input: src.as_bytes(),
            src,
            pos: 0,
            max_pos: 0,
            diagnostics: Vec::new(),
            mode,
        }
    }
}

// Attach a source range field to an Object Value when the state's mode is
// Raws.  Non-object values pass through unchanged -- only outer production
// payloads get a range (mirrors v2's makeSource attach point).
fn attach_source(value: Value, mode: ParseMode, start: usize, end: usize) -> Value {
    if mode != ParseMode::Raws {
        return value;
    }
    if let Value::Object(mut fields) = value {
        fields.push((
            "source".to_string(),
            Value::Object(vec![
                ("start".to_string(), Value::Number(start as f64)),
                ("end".to_string(), Value::Number(end as f64)),
            ]),
        ));
        return Value::Object(fields);
    }
    value
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

fn parse_Comment__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __text_start = state.pos;
    if !(state.pos + 1 < state.input.len() && state.input[state.pos] == b'/' && state.input[state.pos + 1] == b'*') {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 2;
    while state.pos < state.input.len() {
        if state.input[state.pos] == b'*' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'/' {
            state.pos += 2;
            break;
        }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_ts = __text_start + 2;
    let mut __text_te = __text_end - 2;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    while __text_te > __text_ts {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(attach_source(Value::Null, state.mode, entry_pos, state.pos))
}

fn parse_Comment(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_Comment__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_Comment__alt0(__value: &Value) -> Option<String> {
    if !matches!(__value, Value::Null) { return None; }
    let mut __out = String::new();
    Some(__out)
}

fn stringify_Comment(value: &Value) -> String {
    if let Some(out) = stringify_Comment__alt0(value) { return out; }
    String::new()
}

fn parse_JsonNull__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "null") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(attach_source(Value::Null, state.mode, entry_pos, state.pos))
}

fn parse_JsonNull(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_JsonNull__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_JsonNull__alt0(__value: &Value) -> Option<String> {
    if !matches!(__value, Value::Null) { return None; }
    let mut __out = String::new();
    __out.push_str("null");
    Some(__out)
}

fn stringify_JsonNull(value: &Value) -> String {
    if let Some(out) = stringify_JsonNull__alt0(value) { return out; }
    String::new()
}

fn parse_JsonTrue__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "true") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(attach_source(Value::Bool(true), state.mode, entry_pos, state.pos))
}

fn parse_JsonTrue(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_JsonTrue__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_JsonTrue__alt0(__value: &Value) -> Option<String> {
    if let Value::Bool(b) = __value { if *b != true { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("true");
    Some(__out)
}

fn stringify_JsonTrue(value: &Value) -> String {
    if let Some(out) = stringify_JsonTrue__alt0(value) { return out; }
    String::new()
}

fn parse_JsonFalse__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "false") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(attach_source(Value::Bool(false), state.mode, entry_pos, state.pos))
}

fn parse_JsonFalse(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_JsonFalse__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_JsonFalse__alt0(__value: &Value) -> Option<String> {
    if let Value::Bool(b) = __value { if *b != false { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("false");
    Some(__out)
}

fn stringify_JsonFalse(value: &Value) -> String {
    if let Some(out) = stringify_JsonFalse__alt0(value) { return out; }
    String::new()
}

fn parse_JsonNumber__alt0(state: &mut State) -> Option<Value> {
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
    if state.pos < state.input.len() && state.input[state.pos] == b'.' {
        state.pos += 1;
        while state.pos < state.input.len() && is_digit(state.input[state.pos]) {
            state.pos += 1;
        }
    }
    if state.pos < state.input.len() && (state.input[state.pos] == b'e' || state.input[state.pos] == b'E') {
        state.pos += 1;
        if state.pos < state.input.len() && (state.input[state.pos] == b'+' || state.input[state.pos] == b'-') {
            state.pos += 1;
        }
        while state.pos < state.input.len() && is_digit(state.input[state.pos]) {
            state.pos += 1;
        }
    }
    let __value_end = state.pos;
    let value: String = state.src[__value_start..__value_end].to_string();
    Some(attach_source(Value::String(value.clone()), state.mode, entry_pos, state.pos))
}

fn parse_JsonNumber(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_JsonNumber__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_JsonNumber__alt0(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { Some(s.clone()) } else { None }
}

fn stringify_JsonNumber(value: &Value) -> String {
    if let Some(out) = stringify_JsonNumber__alt0(value) { return out; }
    String::new()
}

fn parse_JsonString__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __value_start = state.pos;
    if state.pos >= state.input.len() || state.input[state.pos] != b'"' {
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
        if b == b'"' {
            state.pos += 1;
            break;
        }
        state.pos += 1;
    }
    let __value_end = state.pos;
    let value: String = state.src[__value_start..__value_end].to_string();
    Some(attach_source(Value::String(value.clone()), state.mode, entry_pos, state.pos))
}

fn parse_JsonString__alt1(state: &mut State) -> Option<Value> {
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
    Some(attach_source(Value::String(value.clone()), state.mode, entry_pos, state.pos))
}

fn parse_JsonString(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_JsonString__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_JsonString__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_JsonString__alt0(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { Some(s.clone()) } else { None }
}

fn stringify_JsonString__alt1(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { Some(s.clone()) } else { None }
}

fn stringify_JsonString(value: &Value) -> String {
    if let Some(out) = stringify_JsonString__alt0(value) { return out; }
    if let Some(out) = stringify_JsonString__alt1(value) { return out; }
    String::new()
}

fn parse_JsonArray__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "[") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws_and_comments(state);
    let mut items: Vec<Value> = Vec::new();
    let mut __sep_consumed = false;
    let mut __pre_sweep = state.pos;
    loop {
        let __loop_start = state.pos;
        __pre_sweep = state.pos;
        __sep_consumed = false;
        skip_ws_and_comments(state);
        while match_literal(state, ",") {
            __sep_consumed = true;
            skip_ws_and_comments(state);
        }
        let __iter_snapshot = state.pos;
        let __item = parse_JsonValue(state);
        match __item {
            Some(v) => {
                if state.pos == __iter_snapshot {
                    state.pos = __pre_sweep;
                    break;
                }
                items.push(v);
            }
            None => {
                state.pos = __pre_sweep;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws_and_comments(state);
    if !match_literal(state, "]") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(attach_source(Value::Array(items.clone()), state.mode, entry_pos, state.pos))
}

fn parse_JsonArray(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_JsonArray__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_JsonArray__alt0(__value: &Value) -> Option<String> {
    Some(stringify_JsonValue(__value))
}

fn stringify_JsonArray(value: &Value) -> String {
    if let Some(out) = stringify_JsonArray__alt0(value) { return out; }
    String::new()
}

fn parse_JsonMember__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __key_start = state.pos;
    if state.pos >= state.input.len() || state.input[state.pos] != b'"' {
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
        if b == b'"' {
            state.pos += 1;
            break;
        }
        state.pos += 1;
    }
    let __key_end = state.pos;
    let key: String = state.src[__key_start..__key_end].to_string();
    skip_ws_and_comments(state);
    if !match_literal(state, ":") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws_and_comments(state);
    let value: Value = match parse_JsonValue(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    Some(attach_source(Value::Object(vec![("__dynKey".to_string(), Value::Bool(true)), ("key".to_string(), Value::String(key.clone())), ("value".to_string(), value.clone())]), state.mode, entry_pos, state.pos))
}

fn parse_JsonMember__alt1(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __key_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __key_end = state.pos;
    let key: String = state.src[__key_start..__key_end].to_string();
    skip_ws_and_comments(state);
    if !match_literal(state, ":") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws_and_comments(state);
    let value: Value = match parse_JsonValue(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    Some(attach_source(Value::Object(vec![("__dynKey".to_string(), Value::Bool(true)), ("key".to_string(), Value::String(key.clone())), ("value".to_string(), value.clone())]), state.mode, entry_pos, state.pos))
}

fn parse_JsonMember(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_JsonMember__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_JsonMember__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_JsonMember__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("__dynKey") { Some(Value::Bool(b)) if *b == true => (), _ => return None }
    let key: Option<&Value> = __value.obj_get("key");
    let value: Option<&Value> = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = key { s.clone() } else { String::new() };
    let __s1: String = if let Some(inner) = value { stringify_JsonValue(inner) } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str(":");
    __out.push_str(&__s1);
    Some(__out)
}

fn stringify_JsonMember__alt1(__value: &Value) -> Option<String> {
    match __value.obj_get("__dynKey") { Some(Value::Bool(b)) if *b == true => (), _ => return None }
    let key: Option<&Value> = __value.obj_get("key");
    let value: Option<&Value> = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = key { s.clone() } else { String::new() };
    let __s1: String = if let Some(inner) = value { stringify_JsonValue(inner) } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str(":");
    __out.push_str(&__s1);
    Some(__out)
}

fn stringify_JsonMember(value: &Value) -> String {
    if let Some(out) = stringify_JsonMember__alt0(value) { return out; }
    if let Some(out) = stringify_JsonMember__alt1(value) { return out; }
    String::new()
}

fn parse_JsonObject__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "{") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws_and_comments(state);
    let mut entries: Vec<Value> = Vec::new();
    let mut __sep_consumed = false;
    let mut __pre_sweep = state.pos;
    loop {
        let __loop_start = state.pos;
        __pre_sweep = state.pos;
        __sep_consumed = false;
        skip_ws_and_comments(state);
        while match_literal(state, ",") {
            __sep_consumed = true;
            skip_ws_and_comments(state);
        }
        let __iter_snapshot = state.pos;
        let __item = parse_JsonMember(state);
        match __item {
            Some(v) => {
                if state.pos == __iter_snapshot {
                    state.pos = __pre_sweep;
                    break;
                }
                entries.push(v);
            }
            None => {
                state.pos = __pre_sweep;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws_and_comments(state);
    if !match_literal(state, "}") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(attach_source(Value::Object(vec![("__merge".to_string(), Value::Bool(true)), ("array".to_string(), Value::Array(entries.clone()))]), state.mode, entry_pos, state.pos))
}

fn parse_JsonObject(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_JsonObject__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_JsonObject__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("__merge") { Some(Value::Bool(b)) if *b == true => (), _ => return None }
    let entries: Option<&Value> = __value.obj_get("array");
    let __s0: String = if let Some(Value::Array(items)) = entries { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(","); } __t.push_str(&stringify_JsonMember(item)); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("{");
    __out.push_str(&__s0);
    if !__s0.is_empty() { __out.push_str("}"); }
    Some(__out)
}

fn stringify_JsonObject(value: &Value) -> String {
    if let Some(out) = stringify_JsonObject__alt0(value) { return out; }
    String::new()
}

fn parse_JsonValue__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __rec_snapshot = state.pos;
    let node: Value = 'rec: loop {
        state.pos = __rec_snapshot;
        if let Some(v) = parse_JsonObject(state) { break 'rec v; }
        state.pos = __rec_snapshot;
        if let Some(v) = parse_JsonArray(state) { break 'rec v; }
        state.pos = __rec_snapshot;
        if let Some(v) = parse_JsonString(state) { break 'rec v; }
        state.pos = __rec_snapshot;
        if let Some(v) = parse_JsonNumber(state) { break 'rec v; }
        state.pos = __rec_snapshot;
        if let Some(v) = parse_JsonTrue(state) { break 'rec v; }
        state.pos = __rec_snapshot;
        if let Some(v) = parse_JsonFalse(state) { break 'rec v; }
        state.pos = __rec_snapshot;
        if let Some(v) = parse_JsonNull(state) { break 'rec v; }
        state.pos = entry_pos;
        return None;
    };
    Some(attach_source(node.clone(), state.mode, entry_pos, state.pos))
}

fn parse_JsonValue(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_JsonValue__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_JsonValue__alt0(__value: &Value) -> Option<String> {
    Some(stringify_JsonObject(__value))
}

fn stringify_JsonValue(value: &Value) -> String {
    if let Some(out) = stringify_JsonValue__alt0(value) { return out; }
    String::new()
}

pub fn render(input: &str) -> Result<Value, String> {
    let mut state = State::new(input);
    skip_ws_and_comments(&mut state);
    let result = parse_JsonValue(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws_and_comments(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok(result)
}
pub fn render_raws(input: &str) -> Result<Value, String> {
    let mut state = State::new_with_mode(input, ParseMode::Raws);
    skip_ws_and_comments(&mut state);
    let result = parse_JsonValue(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws_and_comments(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok(result)
}
pub fn render_with_diagnostics(input: &str) -> Result<(Value, Vec<Diagnostic>), String> {
    let mut state = State::new(input);
    skip_ws_and_comments(&mut state);
    let result = parse_JsonValue(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws_and_comments(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok((result, state.diagnostics))
}

pub fn stringify(value: &Value) -> String {
    stringify_JsonValue(value)
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
