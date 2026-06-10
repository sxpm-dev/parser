// Auto-generated from packages/css/src/schema.ts
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
    Some(Value::Object(vec![("type".to_string(), Value::String("comment".to_string())), ("text".to_string(), Value::String(text.clone()))]))
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
    match __value.obj_get("type") { Some(Value::String(s)) if s == "comment" => (), _ => return None }
    let text = __value.obj_get("text");
    let __s0: String = if let Some(Value::String(s)) = text { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("/* ");
    __out.push_str(&__s0);
    __out.push_str(" */");
    Some(__out)
}

fn stringify_Comment(value: &Value) -> String {
    if let Some(out) = stringify_Comment__alt0(value) { return out; }
    String::new()
}

fn parse_Declaration__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __prop_start = state.pos;
    let mut __depth: i32 = 0;
    let __stops: &[&[u8]] = &[":".as_bytes(), ";".as_bytes(), "}".as_bytes()];
    let mut __comments: Vec<(usize, usize)> = Vec::new();
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        if c == b'"' || c == b'\'' {
            let __q = c;
            state.pos += 1;
            while state.pos < state.input.len() {
                let __sc = state.input[state.pos];
                if __sc == b'\\' && state.pos + 1 < state.input.len() { state.pos += 2; continue; }
                if __sc == __q { state.pos += 1; break; }
                if __sc == b'\n' || __sc == b'\r' { break; }
                state.pos += 1;
            }
            continue;
        }
        if c == b'/' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'*' {
            let __cs = state.pos;
            state.pos += 2;
            while state.pos < state.input.len() {
                if state.input[state.pos] == b'*' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'/' { state.pos += 2; break; }
                state.pos += 1;
            }
            __comments.push((__cs, state.pos));
            continue;
        }
        if __depth == 0 {
            let mut __stopped = false;
            for s in __stops.iter() {
                if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                    __stopped = true;
                    break;
                }
            }
            if __stopped { break; }
            if c == b')' || c == b']' || c == b'}' { break; }
        }
        if c == b'(' || c == b'[' || c == b'{' { __depth += 1; }
        else if c == b')' || c == b']' || c == b'}' { __depth -= 1; }
        state.pos += 1;
    }
    let __prop_end = state.pos;
    let mut __prop_te = __prop_end;
    while __prop_te > __prop_start {
        let __tc = state.input[__prop_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __prop_te -= 1;
    }
    let mut __prop_ts = __prop_start;
    while __prop_ts < __prop_te {
        let __lc = state.input[__prop_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __prop_ts += 1;
    }
    let prop: String = if __comments.is_empty() { state.src[__prop_ts..__prop_te].to_string() } else {
        let mut __buf = String::new();
        let mut __cursor = __prop_ts;
        for &(__cs, __ce) in __comments.iter() {
            if __ce > __prop_te { break; }
            if __cs < __prop_ts { continue; }
            let __before = if __cs > 0 { state.input[__cs - 1] } else { 0xFF };
            let __after = if __ce < state.input.len() { state.input[__ce] } else { 0xFF };
            let __is_ws_before = __before == b' ' || __before == b'\t' || __before == b'\n' || __before == b'\r';
            let __is_ws_after = __after == b' ' || __after == b'\t' || __after == b'\n' || __after == b'\r';
            if !(__is_ws_before || __is_ws_after) { continue; }
            __buf.push_str(&state.src[__cursor..__cs]);
            __cursor = __ce;
        }
        __buf.push_str(&state.src[__cursor..__prop_te]);
        __buf
    };
    skip_ws_and_comments(state);
    if !match_literal(state, ":") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws_and_comments(state);
    let __value_start = state.pos;
    let mut __depth: i32 = 0;
    let __stops: &[&[u8]] = &[";".as_bytes(), "}".as_bytes(), "!".as_bytes()];
    let mut __comments: Vec<(usize, usize)> = Vec::new();
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        if c == b'"' || c == b'\'' {
            let __q = c;
            state.pos += 1;
            while state.pos < state.input.len() {
                let __sc = state.input[state.pos];
                if __sc == b'\\' && state.pos + 1 < state.input.len() { state.pos += 2; continue; }
                if __sc == __q { state.pos += 1; break; }
                if __sc == b'\n' || __sc == b'\r' { break; }
                state.pos += 1;
            }
            continue;
        }
        if c == b'/' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'*' {
            let __cs = state.pos;
            state.pos += 2;
            while state.pos < state.input.len() {
                if state.input[state.pos] == b'*' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'/' { state.pos += 2; break; }
                state.pos += 1;
            }
            __comments.push((__cs, state.pos));
            continue;
        }
        if __depth == 0 {
            let mut __stopped = false;
            for s in __stops.iter() {
                if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                    __stopped = true;
                    break;
                }
            }
            if __stopped { break; }
            if c == b')' || c == b']' || c == b'}' { break; }
        }
        if c == b'(' || c == b'[' || c == b'{' { __depth += 1; }
        else if c == b')' || c == b']' || c == b'}' { __depth -= 1; }
        state.pos += 1;
    }
    let __value_end = state.pos;
    let mut __value_te = __value_end;
    while __value_te > __value_start {
        let __tc = state.input[__value_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __value_te -= 1;
    }
    let mut __value_ts = __value_start;
    while __value_ts < __value_te {
        let __lc = state.input[__value_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __value_ts += 1;
    }
    let value: String = if __comments.is_empty() { state.src[__value_ts..__value_te].to_string() } else {
        let mut __buf = String::new();
        let mut __cursor = __value_ts;
        for &(__cs, __ce) in __comments.iter() {
            if __ce > __value_te { break; }
            if __cs < __value_ts { continue; }
            let __before = if __cs > 0 { state.input[__cs - 1] } else { 0xFF };
            let __after = if __ce < state.input.len() { state.input[__ce] } else { 0xFF };
            let __is_ws_before = __before == b' ' || __before == b'\t' || __before == b'\n' || __before == b'\r';
            let __is_ws_after = __after == b' ' || __after == b'\t' || __after == b'\n' || __after == b'\r';
            if !(__is_ws_before || __is_ws_after) { continue; }
            __buf.push_str(&state.src[__cursor..__cs]);
            __cursor = __ce;
        }
        __buf.push_str(&state.src[__cursor..__value_te]);
        __buf
    };
    skip_ws_and_comments(state);
    if !match_literal(state, "!") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws_and_comments(state);
    let __important_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __important_end = state.pos;
    let important: String = state.src[__important_start..__important_end].to_string();
    skip_ws(state);
    let _ = match_literal(state, ";");
    Some(Value::Object(vec![("type".to_string(), Value::String("decl".to_string())), ("prop".to_string(), Value::String(prop.clone())), ("value".to_string(), Value::String(value.clone())), ("important".to_string(), Value::Bool(true)), ("_important".to_string(), Value::String(important.clone()))]))
}

fn parse_Declaration__alt1(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __prop_start = state.pos;
    let mut __depth: i32 = 0;
    let __stops: &[&[u8]] = &[":".as_bytes(), ";".as_bytes(), "}".as_bytes()];
    let mut __comments: Vec<(usize, usize)> = Vec::new();
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        if c == b'"' || c == b'\'' {
            let __q = c;
            state.pos += 1;
            while state.pos < state.input.len() {
                let __sc = state.input[state.pos];
                if __sc == b'\\' && state.pos + 1 < state.input.len() { state.pos += 2; continue; }
                if __sc == __q { state.pos += 1; break; }
                if __sc == b'\n' || __sc == b'\r' { break; }
                state.pos += 1;
            }
            continue;
        }
        if c == b'/' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'*' {
            let __cs = state.pos;
            state.pos += 2;
            while state.pos < state.input.len() {
                if state.input[state.pos] == b'*' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'/' { state.pos += 2; break; }
                state.pos += 1;
            }
            __comments.push((__cs, state.pos));
            continue;
        }
        if __depth == 0 {
            let mut __stopped = false;
            for s in __stops.iter() {
                if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                    __stopped = true;
                    break;
                }
            }
            if __stopped { break; }
            if c == b')' || c == b']' || c == b'}' { break; }
        }
        if c == b'(' || c == b'[' || c == b'{' { __depth += 1; }
        else if c == b')' || c == b']' || c == b'}' { __depth -= 1; }
        state.pos += 1;
    }
    let __prop_end = state.pos;
    let mut __prop_te = __prop_end;
    while __prop_te > __prop_start {
        let __tc = state.input[__prop_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __prop_te -= 1;
    }
    let mut __prop_ts = __prop_start;
    while __prop_ts < __prop_te {
        let __lc = state.input[__prop_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __prop_ts += 1;
    }
    let prop: String = if __comments.is_empty() { state.src[__prop_ts..__prop_te].to_string() } else {
        let mut __buf = String::new();
        let mut __cursor = __prop_ts;
        for &(__cs, __ce) in __comments.iter() {
            if __ce > __prop_te { break; }
            if __cs < __prop_ts { continue; }
            let __before = if __cs > 0 { state.input[__cs - 1] } else { 0xFF };
            let __after = if __ce < state.input.len() { state.input[__ce] } else { 0xFF };
            let __is_ws_before = __before == b' ' || __before == b'\t' || __before == b'\n' || __before == b'\r';
            let __is_ws_after = __after == b' ' || __after == b'\t' || __after == b'\n' || __after == b'\r';
            if !(__is_ws_before || __is_ws_after) { continue; }
            __buf.push_str(&state.src[__cursor..__cs]);
            __cursor = __ce;
        }
        __buf.push_str(&state.src[__cursor..__prop_te]);
        __buf
    };
    skip_ws_and_comments(state);
    if !match_literal(state, ":") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws_and_comments(state);
    let __value_start = state.pos;
    let mut __depth: i32 = 0;
    let __stops: &[&[u8]] = &[";".as_bytes(), "}".as_bytes()];
    let mut __comments: Vec<(usize, usize)> = Vec::new();
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        if c == b'"' || c == b'\'' {
            let __q = c;
            state.pos += 1;
            while state.pos < state.input.len() {
                let __sc = state.input[state.pos];
                if __sc == b'\\' && state.pos + 1 < state.input.len() { state.pos += 2; continue; }
                if __sc == __q { state.pos += 1; break; }
                if __sc == b'\n' || __sc == b'\r' { break; }
                state.pos += 1;
            }
            continue;
        }
        if c == b'/' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'*' {
            let __cs = state.pos;
            state.pos += 2;
            while state.pos < state.input.len() {
                if state.input[state.pos] == b'*' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'/' { state.pos += 2; break; }
                state.pos += 1;
            }
            __comments.push((__cs, state.pos));
            continue;
        }
        if __depth == 0 {
            let mut __stopped = false;
            for s in __stops.iter() {
                if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                    __stopped = true;
                    break;
                }
            }
            if __stopped { break; }
            if c == b')' || c == b']' || c == b'}' { break; }
        }
        if c == b'(' || c == b'[' || c == b'{' { __depth += 1; }
        else if c == b')' || c == b']' || c == b'}' { __depth -= 1; }
        state.pos += 1;
    }
    let __value_end = state.pos;
    let mut __value_te = __value_end;
    while __value_te > __value_start {
        let __tc = state.input[__value_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __value_te -= 1;
    }
    let mut __value_ts = __value_start;
    while __value_ts < __value_te {
        let __lc = state.input[__value_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __value_ts += 1;
    }
    let value: String = if __comments.is_empty() { state.src[__value_ts..__value_te].to_string() } else {
        let mut __buf = String::new();
        let mut __cursor = __value_ts;
        for &(__cs, __ce) in __comments.iter() {
            if __ce > __value_te { break; }
            if __cs < __value_ts { continue; }
            let __before = if __cs > 0 { state.input[__cs - 1] } else { 0xFF };
            let __after = if __ce < state.input.len() { state.input[__ce] } else { 0xFF };
            let __is_ws_before = __before == b' ' || __before == b'\t' || __before == b'\n' || __before == b'\r';
            let __is_ws_after = __after == b' ' || __after == b'\t' || __after == b'\n' || __after == b'\r';
            if !(__is_ws_before || __is_ws_after) { continue; }
            __buf.push_str(&state.src[__cursor..__cs]);
            __cursor = __ce;
        }
        __buf.push_str(&state.src[__cursor..__value_te]);
        __buf
    };
    skip_ws(state);
    let _ = match_literal(state, ";");
    Some(Value::Object(vec![("type".to_string(), Value::String("decl".to_string())), ("prop".to_string(), Value::String(prop.clone())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_Declaration(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_Declaration__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Declaration__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_Declaration__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "decl" => (), _ => return None }
    match __value.obj_get("important") { Some(Value::Bool(b)) if *b == true => (), _ => return None }
    let prop = __value.obj_get("prop");
    let value = __value.obj_get("value");
    let important = __value.obj_get("_important");
    let __s0: String = if let Some(Value::String(s)) = prop { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let __s2: String = if let Some(Value::String(s)) = important { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str(": ");
    __out.push_str(&__s1);
    __out.push_str(" !");
    __out.push_str(&__s2);
    __out.push_str(";");
    Some(__out)
}

fn stringify_Declaration__alt1(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "decl" => (), _ => return None }
    match __value.obj_get("important") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_important") { None | Some(Value::Null) => (), _ => return None }
    let prop = __value.obj_get("prop");
    let value = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = prop { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str(": ");
    __out.push_str(&__s1);
    __out.push_str(";");
    Some(__out)
}

fn stringify_Declaration(value: &Value) -> String {
    if let Some(out) = stringify_Declaration__alt0(value) { return out; }
    if let Some(out) = stringify_Declaration__alt1(value) { return out; }
    String::new()
}

fn parse_Rule__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __selector_start = state.pos;
    let mut __depth: i32 = 0;
    let __stops: &[&[u8]] = &["{".as_bytes(), ";".as_bytes()];
    let mut __comments: Vec<(usize, usize)> = Vec::new();
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        if c == b'"' || c == b'\'' {
            let __q = c;
            state.pos += 1;
            while state.pos < state.input.len() {
                let __sc = state.input[state.pos];
                if __sc == b'\\' && state.pos + 1 < state.input.len() { state.pos += 2; continue; }
                if __sc == __q { state.pos += 1; break; }
                if __sc == b'\n' || __sc == b'\r' { break; }
                state.pos += 1;
            }
            continue;
        }
        if c == b'/' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'*' {
            let __cs = state.pos;
            state.pos += 2;
            while state.pos < state.input.len() {
                if state.input[state.pos] == b'*' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'/' { state.pos += 2; break; }
                state.pos += 1;
            }
            __comments.push((__cs, state.pos));
            continue;
        }
        if __depth == 0 {
            let mut __stopped = false;
            for s in __stops.iter() {
                if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                    __stopped = true;
                    break;
                }
            }
            if __stopped { break; }
            if c == b')' || c == b']' || c == b'}' { break; }
        }
        if c == b'(' || c == b'[' || c == b'{' { __depth += 1; }
        else if c == b')' || c == b']' || c == b'}' { __depth -= 1; }
        state.pos += 1;
    }
    let __selector_end = state.pos;
    let mut __selector_te = __selector_end;
    while __selector_te > __selector_start {
        let __tc = state.input[__selector_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __selector_te -= 1;
    }
    let mut __selector_ts = __selector_start;
    while __selector_ts < __selector_te {
        let __lc = state.input[__selector_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __selector_ts += 1;
    }
    let selector: String = if __comments.is_empty() { state.src[__selector_ts..__selector_te].to_string() } else {
        let mut __buf = String::new();
        let mut __cursor = __selector_ts;
        for &(__cs, __ce) in __comments.iter() {
            if __ce > __selector_te { break; }
            if __cs < __selector_ts { continue; }
            let __before = if __cs > 0 { state.input[__cs - 1] } else { 0xFF };
            let __after = if __ce < state.input.len() { state.input[__ce] } else { 0xFF };
            let __is_ws_before = __before == b' ' || __before == b'\t' || __before == b'\n' || __before == b'\r';
            let __is_ws_after = __after == b' ' || __after == b'\t' || __after == b'\n' || __after == b'\r';
            if !(__is_ws_before || __is_ws_after) { continue; }
            __buf.push_str(&state.src[__cursor..__cs]);
            __cursor = __ce;
        }
        __buf.push_str(&state.src[__cursor..__selector_te]);
        __buf
    };
    skip_ws_and_comments(state);
    if !match_literal(state, "{") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut nodes: Vec<Value> = Vec::new();
    let mut __sep_consumed = false;
    let mut __pre_sweep = state.pos;
    loop {
        let __loop_start = state.pos;
        __pre_sweep = state.pos;
        __sep_consumed = false;
        skip_ws(state);
        while match_literal(state, ";") {
            __sep_consumed = true;
            skip_ws(state);
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_AtRule(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Rule(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Declaration(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            break 'role None;
        };
        match __item {
            Some(v) => nodes.push(v),
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
    Some(Value::Object(vec![("type".to_string(), Value::String("rule".to_string())), ("selector".to_string(), Value::String(selector.clone())), ("nodes".to_string(), Value::Array(nodes.clone()))]))
}

fn parse_Rule(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_Rule__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_Rule__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "rule" => (), _ => return None }
    let selector = __value.obj_get("selector");
    let nodes = __value.obj_get("nodes");
    let __s0: String = if let Some(Value::String(s)) = selector { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = nodes { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(";"); } __t.push_str(&stringify_Comment__alt0(item).or_else(|| stringify_AtRule__alt0(item)).or_else(|| stringify_AtRule__alt1(item)).or_else(|| stringify_Rule__alt0(item)).or_else(|| stringify_Declaration__alt0(item)).or_else(|| stringify_Declaration__alt1(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(" {"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("}"); }
    Some(__out)
}

fn stringify_Rule(value: &Value) -> String {
    if let Some(out) = stringify_Rule__alt0(value) { return out; }
    String::new()
}

fn parse_AtRule__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "@") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws_and_comments(state);
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
    skip_ws_and_comments(state);
    let __params_start = state.pos;
    let mut __depth: i32 = 0;
    let __stops: &[&[u8]] = &[";".as_bytes(), "{".as_bytes()];
    let mut __comments: Vec<(usize, usize)> = Vec::new();
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        if c == b'"' || c == b'\'' {
            let __q = c;
            state.pos += 1;
            while state.pos < state.input.len() {
                let __sc = state.input[state.pos];
                if __sc == b'\\' && state.pos + 1 < state.input.len() { state.pos += 2; continue; }
                if __sc == __q { state.pos += 1; break; }
                if __sc == b'\n' || __sc == b'\r' { break; }
                state.pos += 1;
            }
            continue;
        }
        if c == b'/' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'*' {
            let __cs = state.pos;
            state.pos += 2;
            while state.pos < state.input.len() {
                if state.input[state.pos] == b'*' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'/' { state.pos += 2; break; }
                state.pos += 1;
            }
            __comments.push((__cs, state.pos));
            continue;
        }
        if __depth == 0 {
            let mut __stopped = false;
            for s in __stops.iter() {
                if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                    __stopped = true;
                    break;
                }
            }
            if __stopped { break; }
            if c == b')' || c == b']' || c == b'}' { break; }
        }
        if c == b'(' || c == b'[' || c == b'{' { __depth += 1; }
        else if c == b')' || c == b']' || c == b'}' { __depth -= 1; }
        state.pos += 1;
    }
    let __params_end = state.pos;
    let mut __params_te = __params_end;
    while __params_te > __params_start {
        let __tc = state.input[__params_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __params_te -= 1;
    }
    let mut __params_ts = __params_start;
    while __params_ts < __params_te {
        let __lc = state.input[__params_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __params_ts += 1;
    }
    let params: String = if __comments.is_empty() { state.src[__params_ts..__params_te].to_string() } else {
        let mut __buf = String::new();
        let mut __cursor = __params_ts;
        for &(__cs, __ce) in __comments.iter() {
            if __ce > __params_te { break; }
            if __cs < __params_ts { continue; }
            let __before = if __cs > 0 { state.input[__cs - 1] } else { 0xFF };
            let __after = if __ce < state.input.len() { state.input[__ce] } else { 0xFF };
            let __is_ws_before = __before == b' ' || __before == b'\t' || __before == b'\n' || __before == b'\r';
            let __is_ws_after = __after == b' ' || __after == b'\t' || __after == b'\n' || __after == b'\r';
            if !(__is_ws_before || __is_ws_after) { continue; }
            __buf.push_str(&state.src[__cursor..__cs]);
            __cursor = __ce;
        }
        __buf.push_str(&state.src[__cursor..__params_te]);
        __buf
    };
    skip_ws_and_comments(state);
    if !match_literal(state, "{") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut nodes: Vec<Value> = Vec::new();
    let mut __sep_consumed = false;
    let mut __pre_sweep = state.pos;
    loop {
        let __loop_start = state.pos;
        __pre_sweep = state.pos;
        __sep_consumed = false;
        skip_ws(state);
        while match_literal(state, ";") {
            __sep_consumed = true;
            skip_ws(state);
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_AtRule(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Rule(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Declaration(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            break 'role None;
        };
        match __item {
            Some(v) => nodes.push(v),
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
    Some(Value::Object(vec![("type".to_string(), Value::String("atrule".to_string())), ("name".to_string(), Value::String(name.clone())), ("params".to_string(), Value::String(params.clone())), ("nodes".to_string(), Value::Array(nodes.clone()))]))
}

fn parse_AtRule__alt1(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "@") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws_and_comments(state);
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
    skip_ws_and_comments(state);
    let __params_start = state.pos;
    let mut __depth: i32 = 0;
    let __stops: &[&[u8]] = &[";".as_bytes(), "{".as_bytes(), "}".as_bytes()];
    let mut __comments: Vec<(usize, usize)> = Vec::new();
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
        if c == b'"' || c == b'\'' {
            let __q = c;
            state.pos += 1;
            while state.pos < state.input.len() {
                let __sc = state.input[state.pos];
                if __sc == b'\\' && state.pos + 1 < state.input.len() { state.pos += 2; continue; }
                if __sc == __q { state.pos += 1; break; }
                if __sc == b'\n' || __sc == b'\r' { break; }
                state.pos += 1;
            }
            continue;
        }
        if c == b'/' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'*' {
            let __cs = state.pos;
            state.pos += 2;
            while state.pos < state.input.len() {
                if state.input[state.pos] == b'*' && state.pos + 1 < state.input.len() && state.input[state.pos + 1] == b'/' { state.pos += 2; break; }
                state.pos += 1;
            }
            __comments.push((__cs, state.pos));
            continue;
        }
        if __depth == 0 {
            let mut __stopped = false;
            for s in __stops.iter() {
                if state.pos + s.len() <= state.input.len() && &state.input[state.pos..state.pos + s.len()] == *s {
                    __stopped = true;
                    break;
                }
            }
            if __stopped { break; }
            if c == b')' || c == b']' || c == b'}' { break; }
        }
        if c == b'(' || c == b'[' || c == b'{' { __depth += 1; }
        else if c == b')' || c == b']' || c == b'}' { __depth -= 1; }
        state.pos += 1;
    }
    let __params_end = state.pos;
    let mut __params_te = __params_end;
    while __params_te > __params_start {
        let __tc = state.input[__params_te - 1];
        if __tc != b' ' && __tc != b'\t' && __tc != b'\n' && __tc != b'\r' { break; }
        __params_te -= 1;
    }
    let mut __params_ts = __params_start;
    while __params_ts < __params_te {
        let __lc = state.input[__params_ts];
        if __lc != b' ' && __lc != b'\t' && __lc != b'\n' && __lc != b'\r' { break; }
        __params_ts += 1;
    }
    let params: String = if __comments.is_empty() { state.src[__params_ts..__params_te].to_string() } else {
        let mut __buf = String::new();
        let mut __cursor = __params_ts;
        for &(__cs, __ce) in __comments.iter() {
            if __ce > __params_te { break; }
            if __cs < __params_ts { continue; }
            let __before = if __cs > 0 { state.input[__cs - 1] } else { 0xFF };
            let __after = if __ce < state.input.len() { state.input[__ce] } else { 0xFF };
            let __is_ws_before = __before == b' ' || __before == b'\t' || __before == b'\n' || __before == b'\r';
            let __is_ws_after = __after == b' ' || __after == b'\t' || __after == b'\n' || __after == b'\r';
            if !(__is_ws_before || __is_ws_after) { continue; }
            __buf.push_str(&state.src[__cursor..__cs]);
            __cursor = __ce;
        }
        __buf.push_str(&state.src[__cursor..__params_te]);
        __buf
    };
    skip_ws(state);
    let _ = match_literal(state, ";");
    Some(Value::Object(vec![("type".to_string(), Value::String("atrule".to_string())), ("name".to_string(), Value::String(name.clone())), ("params".to_string(), Value::String(params.clone()))]))
}

fn parse_AtRule(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_AtRule__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_AtRule__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_AtRule__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "atrule" => (), _ => return None }
    let name = __value.obj_get("name");
    let params = __value.obj_get("params");
    let nodes = __value.obj_get("nodes");
    let __s0: String = if let Some(Value::String(s)) = name { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = params { s.clone() } else { String::new() };
    let __s2: String = if let Some(Value::Array(items)) = nodes { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(";"); } __t.push_str(&stringify_Comment__alt0(item).or_else(|| stringify_AtRule__alt0(item)).or_else(|| stringify_AtRule__alt1(item)).or_else(|| stringify_Rule__alt0(item)).or_else(|| stringify_Declaration__alt0(item)).or_else(|| stringify_Declaration__alt1(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("@");
    __out.push_str(&__s0);
    __out.push_str(" ");
    __out.push_str(&__s1);
    if !__s2.is_empty() { __out.push_str(" {"); }
    __out.push_str(&__s2);
    if !__s2.is_empty() { __out.push_str("}"); }
    Some(__out)
}

fn stringify_AtRule__alt1(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "atrule" => (), _ => return None }
    match __value.obj_get("nodes") { None | Some(Value::Null) => (), _ => return None }
    let name = __value.obj_get("name");
    let params = __value.obj_get("params");
    let __s0: String = if let Some(Value::String(s)) = name { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = params { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("@");
    __out.push_str(&__s0);
    __out.push_str(" ");
    __out.push_str(&__s1);
    __out.push_str(";");
    Some(__out)
}

fn stringify_AtRule(value: &Value) -> String {
    if let Some(out) = stringify_AtRule__alt0(value) { return out; }
    if let Some(out) = stringify_AtRule__alt1(value) { return out; }
    String::new()
}

fn parse_Stylesheet__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let mut nodes: Vec<Value> = Vec::new();
    let mut __sep_consumed = false;
    let mut __pre_sweep = state.pos;
    loop {
        let __loop_start = state.pos;
        __pre_sweep = state.pos;
        __sep_consumed = false;
        skip_ws(state);
        while match_literal(state, ";") {
            __sep_consumed = true;
            skip_ws(state);
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_AtRule(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Rule(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Declaration(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            break 'role None;
        };
        match __item {
            Some(v) => nodes.push(v),
            None => {
                state.pos = __pre_sweep;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("root".to_string())), ("nodes".to_string(), Value::Array(nodes.clone()))]))
}

fn parse_Stylesheet(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_Stylesheet__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_Stylesheet__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "root" => (), _ => return None }
    let nodes = __value.obj_get("nodes");
    let __s0: String = if let Some(Value::Array(items)) = nodes { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(";"); } __t.push_str(&stringify_Comment__alt0(item).or_else(|| stringify_AtRule__alt0(item)).or_else(|| stringify_AtRule__alt1(item)).or_else(|| stringify_Rule__alt0(item)).or_else(|| stringify_Declaration__alt0(item)).or_else(|| stringify_Declaration__alt1(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Stylesheet(value: &Value) -> String {
    if let Some(out) = stringify_Stylesheet__alt0(value) { return out; }
    String::new()
}

pub fn render(input: &str) -> Result<Value, String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_Stylesheet(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws_and_comments(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok(result)
}
pub fn render_with_diagnostics(input: &str) -> Result<(Value, Vec<Diagnostic>), String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_Stylesheet(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws_and_comments(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok((result, state.diagnostics))
}

pub fn stringify(value: &Value) -> String {
    stringify_Stylesheet(value)
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
