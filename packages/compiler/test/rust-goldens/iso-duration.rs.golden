// Auto-generated from packages/iso-duration/src/schema.ts
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

struct State<'a> {
    input: &'a [u8],
    src: &'a str,
    pos: usize,
    max_pos: usize,
}

impl<'a> State<'a> {
    fn new(src: &'a str) -> Self {
        Self {
            input: src.as_bytes(),
            src,
            pos: 0,
            max_pos: 0,
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

fn parse_DateUnit__alt0(state: &mut State) -> Option<Value> {
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
    skip_ws(state);
    if !match_literal(state, "Y") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("years".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_DateUnit__alt1(state: &mut State) -> Option<Value> {
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
    skip_ws(state);
    if !match_literal(state, "M") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("months".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_DateUnit__alt2(state: &mut State) -> Option<Value> {
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
    skip_ws(state);
    if !match_literal(state, "W") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("weeks".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_DateUnit__alt3(state: &mut State) -> Option<Value> {
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
    skip_ws(state);
    if !match_literal(state, "D") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("days".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_DateUnit(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_DateUnit__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_DateUnit__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_DateUnit__alt2(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_DateUnit__alt3(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_DateUnit__alt0(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "years" => (), _ => return None }
    let value = value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str("Y");
    Some(__out)
}

fn stringify_DateUnit__alt1(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "months" => (), _ => return None }
    let value = value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str("M");
    Some(__out)
}

fn stringify_DateUnit__alt2(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "weeks" => (), _ => return None }
    let value = value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str("W");
    Some(__out)
}

fn stringify_DateUnit__alt3(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "days" => (), _ => return None }
    let value = value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str("D");
    Some(__out)
}

fn stringify_DateUnit(value: &Value) -> String {
    if let Some(out) = stringify_DateUnit__alt0(value) { return out; }
    if let Some(out) = stringify_DateUnit__alt1(value) { return out; }
    if let Some(out) = stringify_DateUnit__alt2(value) { return out; }
    if let Some(out) = stringify_DateUnit__alt3(value) { return out; }
    String::new()
}

fn parse_TimeUnit__alt0(state: &mut State) -> Option<Value> {
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
    skip_ws(state);
    if !match_literal(state, "H") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("hours".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_TimeUnit__alt1(state: &mut State) -> Option<Value> {
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
    skip_ws(state);
    if !match_literal(state, "M") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("minutes".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_TimeUnit__alt2(state: &mut State) -> Option<Value> {
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
    skip_ws(state);
    if !match_literal(state, "S") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("seconds".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_TimeUnit(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_TimeUnit__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_TimeUnit__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_TimeUnit__alt2(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_TimeUnit__alt0(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "hours" => (), _ => return None }
    let value = value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str("H");
    Some(__out)
}

fn stringify_TimeUnit__alt1(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "minutes" => (), _ => return None }
    let value = value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str("M");
    Some(__out)
}

fn stringify_TimeUnit__alt2(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "seconds" => (), _ => return None }
    let value = value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str("S");
    Some(__out)
}

fn stringify_TimeUnit(value: &Value) -> String {
    if let Some(out) = stringify_TimeUnit__alt0(value) { return out; }
    if let Some(out) = stringify_TimeUnit__alt1(value) { return out; }
    if let Some(out) = stringify_TimeUnit__alt2(value) { return out; }
    String::new()
}

fn parse_Duration__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "P") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut date: Vec<Value> = Vec::new();
    loop {
        let __iter_snapshot = state.pos;
        skip_ws(state);
        let __item = parse_DateUnit(state);
        match __item {
            Some(v) => date.push(v),
            None => { state.pos = __iter_snapshot; break; }
        }
    }
    if date.len() < 1 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("duration".to_string())), ("date".to_string(), Value::Array(date.clone()))]))
}

fn parse_Duration__alt1(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "P") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut date: Vec<Value> = Vec::new();
    loop {
        let __iter_snapshot = state.pos;
        skip_ws(state);
        let __item = parse_DateUnit(state);
        match __item {
            Some(v) => date.push(v),
            None => { state.pos = __iter_snapshot; break; }
        }
    }
    skip_ws(state);
    if !match_literal(state, "T") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut time: Vec<Value> = Vec::new();
    loop {
        let __iter_snapshot = state.pos;
        skip_ws(state);
        let __item = parse_TimeUnit(state);
        match __item {
            Some(v) => time.push(v),
            None => { state.pos = __iter_snapshot; break; }
        }
    }
    if time.len() < 1 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("duration".to_string())), ("date".to_string(), Value::Array(date.clone())), ("time".to_string(), Value::Array(time.clone()))]))
}

fn parse_Duration(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_Duration__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Duration__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_Duration__alt0(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "duration" => (), _ => return None }
    match value.obj_get("time") { None | Some(Value::Null) => (), _ => return None }
    let date = value.obj_get("date");
    let __s0: String = if let Some(Value::Array(items)) = date { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_DateUnit(item)); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("P");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Duration__alt1(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "duration" => (), _ => return None }
    let date = value.obj_get("date");
    let time = value.obj_get("time");
    let __s0: String = if let Some(Value::Array(items)) = date { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_DateUnit(item)); } __t } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = time { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_TimeUnit(item)); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("P");
    __out.push_str(&__s0);
    __out.push_str("T");
    __out.push_str(&__s1);
    Some(__out)
}

fn stringify_Duration(value: &Value) -> String {
    if let Some(out) = stringify_Duration__alt0(value) { return out; }
    if let Some(out) = stringify_Duration__alt1(value) { return out; }
    String::new()
}

pub fn render(input: &str) -> Result<Value, String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_Duration(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok(result)
}

pub fn stringify(value: &Value) -> String {
    stringify_Duration(value)
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
