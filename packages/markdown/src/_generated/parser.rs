// Auto-generated from packages/markdown/src/schema.ts
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

fn parse_MarkdownDocument__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_MarkdownLeaf(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_MarkdownParagraph(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            break 'role None;
        };
        match __item {
            Some(v) => children.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("document".to_string())), ("children".to_string(), Value::Array(children.clone()))]))
}

fn parse_MarkdownDocument(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownDocument__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_MarkdownDocument__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "document" => (), _ => return None }
    let children = __value.obj_get("children");
    let __s0: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_MarkdownLeaf__alt0(item).or_else(|| stringify_MarkdownLeaf__alt1(item)).or_else(|| stringify_MarkdownLeaf__alt2(item)).or_else(|| stringify_MarkdownLeaf__alt3(item)).or_else(|| stringify_MarkdownLeaf__alt4(item)).or_else(|| stringify_MarkdownLeaf__alt5(item)).or_else(|| stringify_MarkdownLeaf__alt6(item)).or_else(|| stringify_MarkdownLeaf__alt7(item)).or_else(|| stringify_MarkdownLeaf__alt8(item)).or_else(|| stringify_MarkdownLeaf__alt9(item)).or_else(|| stringify_MarkdownLeaf__alt10(item)).or_else(|| stringify_MarkdownLeaf__alt11(item)).or_else(|| stringify_MarkdownLeaf__alt12(item)).or_else(|| stringify_MarkdownLeaf__alt13(item)).or_else(|| stringify_MarkdownLeaf__alt14(item)).or_else(|| stringify_MarkdownLeaf__alt15(item)).or_else(|| stringify_MarkdownLeaf__alt16(item)).or_else(|| stringify_MarkdownLeaf__alt17(item)).or_else(|| stringify_MarkdownLeaf__alt18(item)).or_else(|| stringify_MarkdownLeaf__alt19(item)).or_else(|| stringify_MarkdownLeaf__alt20(item)).or_else(|| stringify_MarkdownLeaf__alt21(item)).or_else(|| stringify_MarkdownLeaf__alt22(item)).or_else(|| stringify_MarkdownLeaf__alt23(item)).or_else(|| stringify_MarkdownLeaf__alt24(item)).or_else(|| stringify_MarkdownLeaf__alt25(item)).or_else(|| stringify_MarkdownLeaf__alt26(item)).or_else(|| stringify_MarkdownLeaf__alt27(item)).or_else(|| stringify_MarkdownLeaf__alt28(item)).or_else(|| stringify_MarkdownLeaf__alt29(item)).or_else(|| stringify_MarkdownLeaf__alt30(item)).or_else(|| stringify_MarkdownLeaf__alt31(item)).or_else(|| stringify_MarkdownLeaf__alt32(item)).or_else(|| stringify_MarkdownLeaf__alt33(item)).or_else(|| stringify_MarkdownLeaf__alt34(item)).or_else(|| stringify_MarkdownLeaf__alt35(item)).or_else(|| stringify_MarkdownLeaf__alt36(item)).or_else(|| stringify_MarkdownParagraph__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_MarkdownDocument(value: &Value) -> String {
    if let Some(out) = stringify_MarkdownDocument__alt0(value) { return out; }
    String::new()
}

fn parse_MarkdownLeaf__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "######") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("heading".to_string())), ("depth".to_string(), Value::Number(6_f64)), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt1(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "#####") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("heading".to_string())), ("depth".to_string(), Value::Number(5_f64)), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt2(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "####") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("heading".to_string())), ("depth".to_string(), Value::Number(4_f64)), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt3(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "###") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("heading".to_string())), ("depth".to_string(), Value::Number(3_f64)), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt4(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "##") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("heading".to_string())), ("depth".to_string(), Value::Number(2_f64)), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt5(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "#") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("heading".to_string())), ("depth".to_string(), Value::Number(1_f64)), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt6(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    skip_ws(state);
    if !match_literal(state, "===") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("heading".to_string())), ("depth".to_string(), Value::Number(1_f64)), ("text".to_string(), Value::String(text.clone())), ("style".to_string(), Value::String("setext".to_string()))]))
}

fn parse_MarkdownLeaf__alt7(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    skip_ws(state);
    if !match_literal(state, "---") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("heading".to_string())), ("depth".to_string(), Value::Number(2_f64)), ("text".to_string(), Value::String(text.clone())), ("style".to_string(), Value::String("setext".to_string()))]))
}

fn parse_MarkdownLeaf__alt8(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "***") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("thematic-break".to_string())), ("marker".to_string(), Value::String("*".to_string()))]))
}

fn parse_MarkdownLeaf__alt9(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "___") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("thematic-break".to_string())), ("marker".to_string(), Value::String("_".to_string()))]))
}

fn parse_MarkdownLeaf__alt10(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "---") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("thematic-break".to_string()))]))
}

fn parse_MarkdownLeaf__alt11(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "- [x]") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("task-list-item".to_string())), ("checked".to_string(), Value::Bool(true)), ("marker".to_string(), Value::String("x".to_string())), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt12(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "- [ ]") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("task-list-item".to_string())), ("checked".to_string(), Value::Bool(false)), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt13(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "+ ") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("list-item".to_string())), ("ordered".to_string(), Value::Bool(false)), ("marker".to_string(), Value::String("+".to_string())), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt14(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "* ") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("list-item".to_string())), ("ordered".to_string(), Value::Bool(false)), ("marker".to_string(), Value::String("*".to_string())), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt15(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "- ") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("list-item".to_string())), ("ordered".to_string(), Value::Bool(false)), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt16(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __index_start = state.pos;
    if state.pos >= state.input.len() || !(is_digit(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_digit(state.input[state.pos])) {
        state.pos += 1;
    }
    let __index_end = state.pos;
    let index: String = state.src[__index_start..__index_end].to_string();
    skip_ws(state);
    if !match_literal(state, ".") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("list-item".to_string())), ("ordered".to_string(), Value::Bool(true)), ("index".to_string(), Value::String(index.clone())), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt17(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("blockquote".to_string())), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt18(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "```") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __lang_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __lang_end = state.pos;
    let lang: String = state.src[__lang_start..__lang_end].to_string();
    skip_ws(state);
    let __body_start = state.pos;
    let __stops: &[&[u8]] = &["```".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __body_end = state.pos;
    let mut __body_te = __body_end;
    while __body_te > __body_start {
        let __tc = state.input[__body_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __body_te -= 1;
    }
    let mut __body_ts = __body_start;
    while __body_ts < __body_te {
        let __lc = state.input[__body_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __body_ts += 1;
    }
    let body: String = state.src[__body_ts..__body_te].to_string();
    skip_ws(state);
    if !match_literal(state, "```") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("code-block".to_string())), ("lang".to_string(), Value::String(lang.clone())), ("text".to_string(), Value::String(body.clone()))]))
}

fn parse_MarkdownLeaf__alt19(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "```\n") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __body_start = state.pos;
    let __stops: &[&[u8]] = &["```".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __body_end = state.pos;
    let mut __body_te = __body_end;
    while __body_te > __body_start {
        let __tc = state.input[__body_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __body_te -= 1;
    }
    let mut __body_ts = __body_start;
    while __body_ts < __body_te {
        let __lc = state.input[__body_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __body_ts += 1;
    }
    let body: String = state.src[__body_ts..__body_te].to_string();
    skip_ws(state);
    if !match_literal(state, "```") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("code-block".to_string())), ("text".to_string(), Value::String(body.clone()))]))
}

fn parse_MarkdownLeaf__alt20(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "**") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["**".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    skip_ws(state);
    if !match_literal(state, "**") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("bold".to_string())), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt21(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "*") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["*".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    skip_ws(state);
    if !match_literal(state, "*") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("italic".to_string())), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt22(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "~~") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["~~".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    skip_ws(state);
    if !match_literal(state, "~~") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("strikethrough".to_string())), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt23(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "`") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["`".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    skip_ws(state);
    if !match_literal(state, "`") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("inline-code".to_string())), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt24(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "[") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __label_start = state.pos;
    let __stops: &[&[u8]] = &["]".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __label_end = state.pos;
    let mut __label_te = __label_end;
    while __label_te > __label_start {
        let __tc = state.input[__label_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __label_te -= 1;
    }
    let mut __label_ts = __label_start;
    while __label_ts < __label_te {
        let __lc = state.input[__label_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __label_ts += 1;
    }
    let label: String = state.src[__label_ts..__label_te].to_string();
    skip_ws(state);
    if !match_literal(state, "]") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "(") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __url_start = state.pos;
    let __stops: &[&[u8]] = &[")".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __url_end = state.pos;
    let mut __url_te = __url_end;
    while __url_te > __url_start {
        let __tc = state.input[__url_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __url_te -= 1;
    }
    let mut __url_ts = __url_start;
    while __url_ts < __url_te {
        let __lc = state.input[__url_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __url_ts += 1;
    }
    let url: String = state.src[__url_ts..__url_te].to_string();
    skip_ws(state);
    if !match_literal(state, ")") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("link".to_string())), ("label".to_string(), Value::String(label.clone())), ("url".to_string(), Value::String(url.clone()))]))
}

fn parse_MarkdownLeaf__alt25(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "[") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __label_start = state.pos;
    let __stops: &[&[u8]] = &["]".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __label_end = state.pos;
    let mut __label_te = __label_end;
    while __label_te > __label_start {
        let __tc = state.input[__label_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __label_te -= 1;
    }
    let mut __label_ts = __label_start;
    while __label_ts < __label_te {
        let __lc = state.input[__label_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __label_ts += 1;
    }
    let label: String = state.src[__label_ts..__label_te].to_string();
    skip_ws(state);
    if !match_literal(state, "][") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __id_start = state.pos;
    let __stops: &[&[u8]] = &["]".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __id_end = state.pos;
    let mut __id_te = __id_end;
    while __id_te > __id_start {
        let __tc = state.input[__id_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __id_te -= 1;
    }
    let mut __id_ts = __id_start;
    while __id_ts < __id_te {
        let __lc = state.input[__id_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __id_ts += 1;
    }
    let id: String = state.src[__id_ts..__id_te].to_string();
    skip_ws(state);
    if !match_literal(state, "]") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("reference-link".to_string())), ("label".to_string(), Value::String(label.clone())), ("id".to_string(), Value::String(id.clone()))]))
}

fn parse_MarkdownLeaf__alt26(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "!") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "[") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __alt_start = state.pos;
    let __stops: &[&[u8]] = &["]".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __alt_end = state.pos;
    let mut __alt_te = __alt_end;
    while __alt_te > __alt_start {
        let __tc = state.input[__alt_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __alt_te -= 1;
    }
    let mut __alt_ts = __alt_start;
    while __alt_ts < __alt_te {
        let __lc = state.input[__alt_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __alt_ts += 1;
    }
    let alt: String = state.src[__alt_ts..__alt_te].to_string();
    skip_ws(state);
    if !match_literal(state, "]") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "(") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __url_start = state.pos;
    let __stops: &[&[u8]] = &[")".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __url_end = state.pos;
    let mut __url_te = __url_end;
    while __url_te > __url_start {
        let __tc = state.input[__url_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __url_te -= 1;
    }
    let mut __url_ts = __url_start;
    while __url_ts < __url_te {
        let __lc = state.input[__url_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __url_ts += 1;
    }
    let url: String = state.src[__url_ts..__url_te].to_string();
    skip_ws(state);
    if !match_literal(state, ")") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("image".to_string())), ("alt".to_string(), Value::String(alt.clone())), ("url".to_string(), Value::String(url.clone()))]))
}

fn parse_MarkdownLeaf__alt27(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "!") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "[") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __alt_start = state.pos;
    let __stops: &[&[u8]] = &["]".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __alt_end = state.pos;
    let mut __alt_te = __alt_end;
    while __alt_te > __alt_start {
        let __tc = state.input[__alt_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __alt_te -= 1;
    }
    let mut __alt_ts = __alt_start;
    while __alt_ts < __alt_te {
        let __lc = state.input[__alt_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __alt_ts += 1;
    }
    let alt: String = state.src[__alt_ts..__alt_te].to_string();
    skip_ws(state);
    if !match_literal(state, "][") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __id_start = state.pos;
    let __stops: &[&[u8]] = &["]".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __id_end = state.pos;
    let mut __id_te = __id_end;
    while __id_te > __id_start {
        let __tc = state.input[__id_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __id_te -= 1;
    }
    let mut __id_ts = __id_start;
    while __id_ts < __id_te {
        let __lc = state.input[__id_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __id_ts += 1;
    }
    let id: String = state.src[__id_ts..__id_te].to_string();
    skip_ws(state);
    if !match_literal(state, "]") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("reference-image".to_string())), ("alt".to_string(), Value::String(alt.clone())), ("id".to_string(), Value::String(id.clone()))]))
}

fn parse_MarkdownLeaf__alt28(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "&") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
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
    skip_ws(state);
    if !match_literal(state, ";") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("entity".to_string())), ("name".to_string(), Value::String(name.clone()))]))
}

fn parse_MarkdownLeaf__alt29(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "|") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "---") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "|") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "---") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "|") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("table-delimiter".to_string())), ("variant".to_string(), Value::String("plain".to_string())), ("align".to_string(), Value::Array(vec![Value::String("default".to_string()), Value::String("default".to_string())]))]))
}

fn parse_MarkdownLeaf__alt30(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "|") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, ":") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "---") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "|") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "---") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, ":") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "|") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("table-delimiter".to_string())), ("variant".to_string(), Value::String("aligned".to_string())), ("align".to_string(), Value::Array(vec![Value::String("left".to_string()), Value::String("right".to_string())]))]))
}

fn parse_MarkdownLeaf__alt31(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "|") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __first_start = state.pos;
    let __stops: &[&[u8]] = &["|".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __first_end = state.pos;
    let mut __first_te = __first_end;
    while __first_te > __first_start {
        let __tc = state.input[__first_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __first_te -= 1;
    }
    let mut __first_ts = __first_start;
    while __first_ts < __first_te {
        let __lc = state.input[__first_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __first_ts += 1;
    }
    let first: String = state.src[__first_ts..__first_te].to_string();
    skip_ws(state);
    if !match_literal(state, "|") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __second_start = state.pos;
    let __stops: &[&[u8]] = &["|".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __second_end = state.pos;
    let mut __second_te = __second_end;
    while __second_te > __second_start {
        let __tc = state.input[__second_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __second_te -= 1;
    }
    let mut __second_ts = __second_start;
    while __second_ts < __second_te {
        let __lc = state.input[__second_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __second_ts += 1;
    }
    let second: String = state.src[__second_ts..__second_te].to_string();
    skip_ws(state);
    if !match_literal(state, "|") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("table-row".to_string())), ("cells".to_string(), Value::Array(vec![Value::String(first.clone()), Value::String(second.clone())]))]))
}

fn parse_MarkdownLeaf__alt32(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "[") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __id_start = state.pos;
    let __stops: &[&[u8]] = &["]".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __id_end = state.pos;
    let mut __id_te = __id_end;
    while __id_te > __id_start {
        let __tc = state.input[__id_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __id_te -= 1;
    }
    let mut __id_ts = __id_start;
    while __id_ts < __id_te {
        let __lc = state.input[__id_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __id_ts += 1;
    }
    let id: String = state.src[__id_ts..__id_te].to_string();
    skip_ws(state);
    if !match_literal(state, "]") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, ":") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __url_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __url_end = state.pos;
    let mut __url_te = __url_end;
    while __url_te > __url_start {
        let __tc = state.input[__url_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __url_te -= 1;
    }
    let mut __url_ts = __url_start;
    while __url_ts < __url_te {
        let __lc = state.input[__url_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __url_ts += 1;
    }
    let url: String = state.src[__url_ts..__url_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("definition".to_string())), ("id".to_string(), Value::String(id.clone())), ("url".to_string(), Value::String(url.clone()))]))
}

fn parse_MarkdownLeaf__alt33(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "[^") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __id_start = state.pos;
    let __stops: &[&[u8]] = &["]".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __id_end = state.pos;
    let mut __id_te = __id_end;
    while __id_te > __id_start {
        let __tc = state.input[__id_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __id_te -= 1;
    }
    let mut __id_ts = __id_start;
    while __id_ts < __id_te {
        let __lc = state.input[__id_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __id_ts += 1;
    }
    let id: String = state.src[__id_ts..__id_te].to_string();
    skip_ws(state);
    if !match_literal(state, "]") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, ":") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("footnote-definition".to_string())), ("id".to_string(), Value::String(id.clone())), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownLeaf__alt34(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "[^") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __id_start = state.pos;
    let __stops: &[&[u8]] = &["]".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __id_end = state.pos;
    let mut __id_te = __id_end;
    while __id_te > __id_start {
        let __tc = state.input[__id_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __id_te -= 1;
    }
    let mut __id_ts = __id_start;
    while __id_ts < __id_te {
        let __lc = state.input[__id_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __id_ts += 1;
    }
    let id: String = state.src[__id_ts..__id_te].to_string();
    skip_ws(state);
    if !match_literal(state, "]") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("footnote-reference".to_string())), ("id".to_string(), Value::String(id.clone()))]))
}

fn parse_MarkdownLeaf__alt35(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "<") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __tag_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __tag_end = state.pos;
    let tag: String = state.src[__tag_start..__tag_end].to_string();
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __body_start = state.pos;
    while state.pos < state.input.len() {
        if state.input[state.pos..].starts_with("</".as_bytes()) { break; }
        state.pos += 1;
    }
    let __body_end = state.pos;
    let body: String = state.src[__body_start..__body_end].to_string();
    skip_ws(state);
    if !match_literal(state, "</") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __closingTag_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __closingTag_end = state.pos;
    let closingTag: String = state.src[__closingTag_start..__closingTag_end].to_string();
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("html".to_string())), ("tag".to_string(), Value::String(tag.clone())), ("text".to_string(), Value::String(body.clone())), ("closingTag".to_string(), Value::String(closingTag.clone()))]))
}

fn parse_MarkdownLeaf__alt36(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "<") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __url_start = state.pos;
    let __stops: &[&[u8]] = &[">".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __url_end = state.pos;
    let mut __url_te = __url_end;
    while __url_te > __url_start {
        let __tc = state.input[__url_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __url_te -= 1;
    }
    let mut __url_ts = __url_start;
    while __url_ts < __url_te {
        let __lc = state.input[__url_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __url_ts += 1;
    }
    let url: String = state.src[__url_ts..__url_te].to_string();
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("autolink".to_string())), ("url".to_string(), Value::String(url.clone()))]))
}

fn parse_MarkdownLeaf(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt2(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt3(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt4(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt5(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt6(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt7(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt20(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt9(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt11(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt12(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt15(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt13(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt21(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt10(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt16(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt17(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt18(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt19(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt14(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt8(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt22(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt23(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt24(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt25(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt26(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt27(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt28(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt30(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt29(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt31(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt32(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt33(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt34(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt35(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownLeaf__alt36(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_MarkdownLeaf__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "heading" => (), _ => return None }
    match __value.obj_get("depth") { Some(Value::Number(n)) if *n == 6_f64 => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<h6>");
    __out.push_str(&__s0);
    __out.push_str("</h6>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt1(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "heading" => (), _ => return None }
    match __value.obj_get("depth") { Some(Value::Number(n)) if *n == 5_f64 => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<h5>");
    __out.push_str(&__s0);
    __out.push_str("</h5>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt2(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "heading" => (), _ => return None }
    match __value.obj_get("depth") { Some(Value::Number(n)) if *n == 4_f64 => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<h4>");
    __out.push_str(&__s0);
    __out.push_str("</h4>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt3(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "heading" => (), _ => return None }
    match __value.obj_get("depth") { Some(Value::Number(n)) if *n == 3_f64 => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<h3>");
    __out.push_str(&__s0);
    __out.push_str("</h3>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt4(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "heading" => (), _ => return None }
    match __value.obj_get("depth") { Some(Value::Number(n)) if *n == 2_f64 => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<h2>");
    __out.push_str(&__s0);
    __out.push_str("</h2>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt5(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "heading" => (), _ => return None }
    match __value.obj_get("depth") { Some(Value::Number(n)) if *n == 1_f64 => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<h1>");
    __out.push_str(&__s0);
    __out.push_str("</h1>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt6(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "heading" => (), _ => return None }
    match __value.obj_get("depth") { Some(Value::Number(n)) if *n == 1_f64 => (), _ => return None }
    match __value.obj_get("style") { Some(Value::String(s)) if s == "setext" => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<h1>");
    __out.push_str(&__s0);
    __out.push_str("</h1>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt7(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "heading" => (), _ => return None }
    match __value.obj_get("depth") { Some(Value::Number(n)) if *n == 2_f64 => (), _ => return None }
    match __value.obj_get("style") { Some(Value::String(s)) if s == "setext" => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<h2>");
    __out.push_str(&__s0);
    __out.push_str("</h2>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt8(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "thematic-break" => (), _ => return None }
    match __value.obj_get("marker") { Some(Value::String(s)) if s == "*" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let mut __out = String::new();
    __out.push_str("<hr>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt9(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "thematic-break" => (), _ => return None }
    match __value.obj_get("marker") { Some(Value::String(s)) if s == "_" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let mut __out = String::new();
    __out.push_str("<hr>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt10(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "thematic-break" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let mut __out = String::new();
    __out.push_str("<hr>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt11(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "task-list-item" => (), _ => return None }
    match __value.obj_get("checked") { Some(Value::Bool(b)) if *b == true => (), _ => return None }
    match __value.obj_get("marker") { Some(Value::String(s)) if s == "x" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<li><input type=\"checkbox\" checked>");
    __out.push_str(&__s0);
    __out.push_str("</li>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt12(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "task-list-item" => (), _ => return None }
    match __value.obj_get("checked") { Some(Value::Bool(b)) if *b == false => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<li><input type=\"checkbox\">");
    __out.push_str(&__s0);
    __out.push_str("</li>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt13(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "list-item" => (), _ => return None }
    match __value.obj_get("ordered") { Some(Value::Bool(b)) if *b == false => (), _ => return None }
    match __value.obj_get("marker") { Some(Value::String(s)) if s == "+" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<li>");
    __out.push_str(&__s0);
    __out.push_str("</li>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt14(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "list-item" => (), _ => return None }
    match __value.obj_get("ordered") { Some(Value::Bool(b)) if *b == false => (), _ => return None }
    match __value.obj_get("marker") { Some(Value::String(s)) if s == "*" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<li>");
    __out.push_str(&__s0);
    __out.push_str("</li>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt15(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "list-item" => (), _ => return None }
    match __value.obj_get("ordered") { Some(Value::Bool(b)) if *b == false => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<li>");
    __out.push_str(&__s0);
    __out.push_str("</li>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt16(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "list-item" => (), _ => return None }
    match __value.obj_get("ordered") { Some(Value::Bool(b)) if *b == true => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<li>");
    __out.push_str(&__s0);
    __out.push_str("</li>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt17(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "blockquote" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<blockquote>");
    __out.push_str(&__s0);
    __out.push_str("</blockquote>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt18(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "code-block" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let lang = __value.obj_get("lang");
    let body = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = lang { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = body { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<pre><code class=\"lang-");
    __out.push_str(&__s0);
    __out.push_str("\">");
    __out.push_str(&__s1);
    __out.push_str("</code></pre>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt19(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "code-block" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let body = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = body { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<pre><code>");
    __out.push_str(&__s0);
    __out.push_str("</code></pre>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt20(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "bold" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<strong>");
    __out.push_str(&__s0);
    __out.push_str("</strong>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt21(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "italic" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<em>");
    __out.push_str(&__s0);
    __out.push_str("</em>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt22(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "strikethrough" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<s>");
    __out.push_str(&__s0);
    __out.push_str("</s>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt23(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "inline-code" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<code>");
    __out.push_str(&__s0);
    __out.push_str("</code>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt24(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "link" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let url = __value.obj_get("url");
    let label = __value.obj_get("label");
    let __s0: String = if let Some(Value::String(s)) = url { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = label { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<a href=\"");
    __out.push_str(&__s0);
    __out.push_str("\">");
    __out.push_str(&__s1);
    __out.push_str("</a>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt25(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "reference-link" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let id = __value.obj_get("id");
    let label = __value.obj_get("label");
    let __s0: String = if let Some(Value::String(s)) = id { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = label { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<a href=\"#");
    __out.push_str(&__s0);
    __out.push_str("\">");
    __out.push_str(&__s1);
    __out.push_str("</a>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt26(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "image" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let url = __value.obj_get("url");
    let alt = __value.obj_get("alt");
    let __s0: String = if let Some(Value::String(s)) = url { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = alt { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<img src=\"");
    __out.push_str(&__s0);
    __out.push_str("\" alt=\"");
    __out.push_str(&__s1);
    __out.push_str("\">");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt27(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "reference-image" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let id = __value.obj_get("id");
    let alt = __value.obj_get("alt");
    let __s0: String = if let Some(Value::String(s)) = id { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = alt { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<img src=\"#");
    __out.push_str(&__s0);
    __out.push_str("\" alt=\"");
    __out.push_str(&__s1);
    __out.push_str("\">");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt28(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "entity" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let name = __value.obj_get("name");
    let __s0: String = if let Some(Value::String(s)) = name { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("&");
    __out.push_str(&__s0);
    __out.push_str(";");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt29(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "table-delimiter" => (), _ => return None }
    match __value.obj_get("variant") { Some(Value::String(s)) if s == "plain" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let mut __out = String::new();
    Some(__out)
}

fn stringify_MarkdownLeaf__alt30(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "table-delimiter" => (), _ => return None }
    match __value.obj_get("variant") { Some(Value::String(s)) if s == "aligned" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let mut __out = String::new();
    Some(__out)
}

fn stringify_MarkdownLeaf__alt31(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "table-row" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let first: Option<&Value> = None;
    let second: Option<&Value> = None;
    let __s0: String = if let Some(Value::String(s)) = first { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = second { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<tr><td>");
    __out.push_str(&__s0);
    __out.push_str("</td><td>");
    __out.push_str(&__s1);
    __out.push_str("</td></tr>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt32(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "definition" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let mut __out = String::new();
    Some(__out)
}

fn stringify_MarkdownLeaf__alt33(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "footnote-definition" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let id = __value.obj_get("id");
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = id { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<div class=\"footnote\" id=\"fn");
    __out.push_str(&__s0);
    __out.push_str("\">");
    __out.push_str(&__s1);
    __out.push_str("</div>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt34(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "footnote-reference" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let id = __value.obj_get("id");
    let __s0: String = if let Some(Value::String(s)) = id { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = id { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<sup><a href=\"#fn");
    __out.push_str(&__s0);
    __out.push_str("\">");
    __out.push_str(&__s1);
    __out.push_str("</a></sup>");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt35(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "html" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("url") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("tag");
    let body = __value.obj_get("text");
    let closingTag = __value.obj_get("closingTag");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = body { s.clone() } else { String::new() };
    let __s2: String = if let Some(Value::String(s)) = closingTag { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    __out.push_str(">");
    __out.push_str(&__s1);
    __out.push_str("</");
    __out.push_str(&__s2);
    __out.push_str(">");
    Some(__out)
}

fn stringify_MarkdownLeaf__alt36(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "autolink" => (), _ => return None }
    match __value.obj_get("depth") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("text") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("style") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("marker") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("checked") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("ordered") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("index") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("lang") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("label") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("id") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("alt") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("name") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("variant") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("align") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("cells") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("tag") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("closingTag") { None | Some(Value::Null) => (), _ => return None }
    let url = __value.obj_get("url");
    let __s0: String = if let Some(Value::String(s)) = url { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = url { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<a class=\"autolink\" href=\"");
    __out.push_str(&__s0);
    __out.push_str("\">");
    __out.push_str(&__s1);
    __out.push_str("</a>");
    Some(__out)
}

fn stringify_MarkdownLeaf(value: &Value) -> String {
    if let Some(out) = stringify_MarkdownLeaf__alt0(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt1(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt2(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt3(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt4(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt5(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt6(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt7(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt8(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt9(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt10(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt11(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt12(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt13(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt14(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt15(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt16(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt17(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt18(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt19(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt20(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt21(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt22(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt23(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt24(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt25(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt26(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt27(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt28(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt29(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt30(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt31(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt32(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt33(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt34(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt35(value) { return out; }
    if let Some(out) = stringify_MarkdownLeaf__alt36(value) { return out; }
    String::new()
}

fn parse_MarkdownParagraph__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __text_start = state.pos;
    let __stops: &[&[u8]] = &["\n\n".as_bytes(), "\n#".as_bytes(), "\n>".as_bytes(), "\n- ".as_bytes(), "\n-\n".as_bytes(), "\n+ ".as_bytes(), "\n* ".as_bytes(), "\n```".as_bytes(), "\n|".as_bytes(), "\n---".as_bytes(), "\n***".as_bytes(), "\n___".as_bytes(), "\n===".as_bytes(), "\n[".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        let mut __stopped = false;
        for s in __stops.iter() {
            if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                __stopped = true;
                break;
            }
        }
        if __stopped { break; }
        state.pos += 1;
    }
    let __text_end = state.pos;
    let mut __text_te = __text_end;
    while __text_te > __text_start {
        let __tc = state.input[__text_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __text_te -= 1;
    }
    let mut __text_ts = __text_start;
    while __text_ts < __text_te {
        let __lc = state.input[__text_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __text_ts += 1;
    }
    let text: String = state.src[__text_ts..__text_te].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("paragraph".to_string())), ("text".to_string(), Value::String(text.clone()))]))
}

fn parse_MarkdownParagraph(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_MarkdownParagraph__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_MarkdownParagraph__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "paragraph" => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<p>");
    __out.push_str(&__s0);
    __out.push_str("</p>");
    Some(__out)
}

fn stringify_MarkdownParagraph(value: &Value) -> String {
    if let Some(out) = stringify_MarkdownParagraph__alt0(value) { return out; }
    String::new()
}

pub fn render(input: &str) -> Result<Value, String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_MarkdownDocument(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok(result)
}
pub fn render_with_diagnostics(input: &str) -> Result<(Value, Vec<Diagnostic>), String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_MarkdownDocument(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok((result, state.diagnostics))
}

pub fn stringify(value: &Value) -> String {
    stringify_MarkdownDocument(value)
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
