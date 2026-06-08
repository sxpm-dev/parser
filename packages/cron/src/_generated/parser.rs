// Auto-generated from packages/cron/src/schema.ts
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

fn parse_CronField__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "*") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("wildcard".to_string()))]))
}

fn parse_CronField__alt1(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "*") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "/") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __step_start = state.pos;
    if state.pos >= state.input.len() || !(is_digit(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_digit(state.input[state.pos])) {
        state.pos += 1;
    }
    let __step_end = state.pos;
    let step: String = state.src[__step_start..__step_end].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("step".to_string())), ("step".to_string(), Value::String(step.clone()))]))
}

fn parse_CronField__alt2(state: &mut State) -> Option<Value> {
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
    Some(Value::Object(vec![("type".to_string(), Value::String("value".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_CronField__alt3(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __start_start = state.pos;
    if state.pos >= state.input.len() || !(is_digit(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_digit(state.input[state.pos])) {
        state.pos += 1;
    }
    let __start_end = state.pos;
    let start: String = state.src[__start_start..__start_end].to_string();
    skip_ws(state);
    if !match_literal(state, "-") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __end_start = state.pos;
    if state.pos >= state.input.len() || !(is_digit(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_digit(state.input[state.pos])) {
        state.pos += 1;
    }
    let __end_end = state.pos;
    let end: String = state.src[__end_start..__end_end].to_string();
    Some(Value::Object(vec![("type".to_string(), Value::String("range".to_string())), ("start".to_string(), Value::String(start.clone())), ("end".to_string(), Value::String(end.clone()))]))
}

fn parse_CronField(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_CronField__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_CronField__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_CronField__alt3(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_CronField__alt2(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_CronField__alt0(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "wildcard" => (), _ => return None }
    match value.obj_get("step") { None | Some(Value::Null) => (), _ => return None }
    match value.obj_get("value") { None | Some(Value::Null) => (), _ => return None }
    match value.obj_get("start") { None | Some(Value::Null) => (), _ => return None }
    match value.obj_get("end") { None | Some(Value::Null) => (), _ => return None }
    let mut __out = String::new();
    __out.push_str("*");
    Some(__out)
}

fn stringify_CronField__alt1(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "step" => (), _ => return None }
    match value.obj_get("value") { None | Some(Value::Null) => (), _ => return None }
    match value.obj_get("start") { None | Some(Value::Null) => (), _ => return None }
    match value.obj_get("end") { None | Some(Value::Null) => (), _ => return None }
    let step = value.obj_get("step");
    let __s0: String = if let Some(Value::String(s)) = step { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("*/");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_CronField__alt2(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "value" => (), _ => return None }
    match value.obj_get("step") { None | Some(Value::Null) => (), _ => return None }
    match value.obj_get("start") { None | Some(Value::Null) => (), _ => return None }
    match value.obj_get("end") { None | Some(Value::Null) => (), _ => return None }
    let value = value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_CronField__alt3(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "range" => (), _ => return None }
    match value.obj_get("step") { None | Some(Value::Null) => (), _ => return None }
    match value.obj_get("value") { None | Some(Value::Null) => (), _ => return None }
    let start = value.obj_get("start");
    let end = value.obj_get("end");
    let __s0: String = if let Some(Value::String(s)) = start { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = end { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str("-");
    __out.push_str(&__s1);
    Some(__out)
}

fn stringify_CronField(value: &Value) -> String {
    if let Some(out) = stringify_CronField__alt0(value) { return out; }
    if let Some(out) = stringify_CronField__alt1(value) { return out; }
    if let Some(out) = stringify_CronField__alt2(value) { return out; }
    if let Some(out) = stringify_CronField__alt3(value) { return out; }
    String::new()
}

fn parse_CommandWord__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __value_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __value_end = state.pos;
    let value: String = state.src[__value_start..__value_end].to_string();
    Some(Value::String(value.clone()))
}

fn parse_CommandWord(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_CommandWord__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_CommandWord__alt0(value: &Value) -> Option<String> {
    if let Value::String(s) = value { Some(s.clone()) } else { None }
}

fn stringify_CommandWord(value: &Value) -> String {
    if let Some(out) = stringify_CommandWord__alt0(value) { return out; }
    String::new()
}

fn parse_Command__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let mut words: Vec<Value> = Vec::new();
    loop {
        let __iter_snapshot = state.pos;
        skip_ws(state);
        let __item = parse_CommandWord(state);
        match __item {
            Some(v) => words.push(v),
            None => { state.pos = __iter_snapshot; break; }
        }
    }
    if words.len() < 1 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("command".to_string())), ("words".to_string(), Value::Array(words.clone()))]))
}

fn parse_Command(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_Command__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_Command__alt0(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "command" => (), _ => return None }
    let words = value.obj_get("words");
    let __s0: String = if let Some(Value::Array(items)) = words { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_CommandWord(item)); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Command(value: &Value) -> String {
    if let Some(out) = stringify_Command__alt0(value) { return out; }
    String::new()
}

fn parse_Cron__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let minute: Value = match parse_CronField(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    skip_ws(state);
    let hour: Value = match parse_CronField(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    skip_ws(state);
    let dayOfMonth: Value = match parse_CronField(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    skip_ws(state);
    let month: Value = match parse_CronField(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    skip_ws(state);
    let dayOfWeek: Value = match parse_CronField(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    skip_ws(state);
    let __command_snapshot = state.pos;
    let command: Option<Value> = 'opt: loop {
        state.pos = __command_snapshot;
        if let Some(v) = parse_Command(state) { break 'opt Some(v); }
        state.pos = __command_snapshot;
        break 'opt None;
    };
    Some(Value::Object(vec![("type".to_string(), Value::String("cron".to_string())), ("minute".to_string(), minute.clone()), ("hour".to_string(), hour.clone()), ("dayOfMonth".to_string(), dayOfMonth.clone()), ("month".to_string(), month.clone()), ("dayOfWeek".to_string(), dayOfWeek.clone()), ("command".to_string(), opt_value(&command))]))
}

fn parse_Cron(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_Cron__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_Cron__alt0(value: &Value) -> Option<String> {
    match value.obj_get("type") { Some(Value::String(s)) if s == "cron" => (), _ => return None }
    let minute = value.obj_get("minute");
    let hour = value.obj_get("hour");
    let dayOfMonth = value.obj_get("dayOfMonth");
    let month = value.obj_get("month");
    let dayOfWeek = value.obj_get("dayOfWeek");
    let command = value.obj_get("command");
    let __s0: String = if let Some(inner) = minute { stringify_CronField(inner) } else { String::new() };
    let __s1: String = if let Some(inner) = hour { stringify_CronField(inner) } else { String::new() };
    let __s2: String = if let Some(inner) = dayOfMonth { stringify_CronField(inner) } else { String::new() };
    let __s3: String = if let Some(inner) = month { stringify_CronField(inner) } else { String::new() };
    let __s4: String = if let Some(inner) = dayOfWeek { stringify_CronField(inner) } else { String::new() };
    let __s5: String = if let Some(inner) = command { if !matches!(inner, Value::Null) { stringify_Command(inner) } else { String::new() } } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str(" ");
    __out.push_str(&__s1);
    __out.push_str(" ");
    __out.push_str(&__s2);
    __out.push_str(" ");
    __out.push_str(&__s3);
    __out.push_str(" ");
    __out.push_str(&__s4);
    if !__s5.is_empty() { __out.push_str(" "); }
    __out.push_str(&__s5);
    Some(__out)
}

fn stringify_Cron(value: &Value) -> String {
    if let Some(out) = stringify_Cron__alt0(value) { return out; }
    String::new()
}

pub fn render(input: &str) -> Result<Value, String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_Cron(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok(result)
}

pub fn stringify(value: &Value) -> String {
    stringify_Cron(value)
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
