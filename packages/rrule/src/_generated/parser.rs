// Auto-generated from packages/rrule/src/schema.ts
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

fn parse_FreqValue__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "SECONDLY") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("SECONDLY".to_string()))
}

fn parse_FreqValue__alt1(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "MINUTELY") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("MINUTELY".to_string()))
}

fn parse_FreqValue__alt2(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "HOURLY") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("HOURLY".to_string()))
}

fn parse_FreqValue__alt3(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "DAILY") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("DAILY".to_string()))
}

fn parse_FreqValue__alt4(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "WEEKLY") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("WEEKLY".to_string()))
}

fn parse_FreqValue__alt5(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "MONTHLY") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("MONTHLY".to_string()))
}

fn parse_FreqValue__alt6(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "YEARLY") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("YEARLY".to_string()))
}

fn parse_FreqValue(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_FreqValue__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_FreqValue__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_FreqValue__alt2(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_FreqValue__alt3(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_FreqValue__alt4(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_FreqValue__alt5(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_FreqValue__alt6(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_FreqValue__alt0(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "SECONDLY" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("SECONDLY");
    Some(__out)
}

fn stringify_FreqValue__alt1(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "MINUTELY" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("MINUTELY");
    Some(__out)
}

fn stringify_FreqValue__alt2(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "HOURLY" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("HOURLY");
    Some(__out)
}

fn stringify_FreqValue__alt3(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "DAILY" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("DAILY");
    Some(__out)
}

fn stringify_FreqValue__alt4(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "WEEKLY" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("WEEKLY");
    Some(__out)
}

fn stringify_FreqValue__alt5(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "MONTHLY" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("MONTHLY");
    Some(__out)
}

fn stringify_FreqValue__alt6(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "YEARLY" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("YEARLY");
    Some(__out)
}

fn stringify_FreqValue(value: &Value) -> String {
    if let Some(out) = stringify_FreqValue__alt0(value) { return out; }
    if let Some(out) = stringify_FreqValue__alt1(value) { return out; }
    if let Some(out) = stringify_FreqValue__alt2(value) { return out; }
    if let Some(out) = stringify_FreqValue__alt3(value) { return out; }
    if let Some(out) = stringify_FreqValue__alt4(value) { return out; }
    if let Some(out) = stringify_FreqValue__alt5(value) { return out; }
    if let Some(out) = stringify_FreqValue__alt6(value) { return out; }
    String::new()
}

fn parse_Weekday__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "SU") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("SU".to_string()))
}

fn parse_Weekday__alt1(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "MO") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("MO".to_string()))
}

fn parse_Weekday__alt2(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "TU") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("TU".to_string()))
}

fn parse_Weekday__alt3(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "WE") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("WE".to_string()))
}

fn parse_Weekday__alt4(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "TH") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("TH".to_string()))
}

fn parse_Weekday__alt5(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "FR") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("FR".to_string()))
}

fn parse_Weekday__alt6(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "SA") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::String("SA".to_string()))
}

fn parse_Weekday(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_Weekday__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Weekday__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Weekday__alt2(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Weekday__alt3(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Weekday__alt4(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Weekday__alt5(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Weekday__alt6(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_Weekday__alt0(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "SU" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("SU");
    Some(__out)
}

fn stringify_Weekday__alt1(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "MO" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("MO");
    Some(__out)
}

fn stringify_Weekday__alt2(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "TU" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("TU");
    Some(__out)
}

fn stringify_Weekday__alt3(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "WE" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("WE");
    Some(__out)
}

fn stringify_Weekday__alt4(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "TH" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("TH");
    Some(__out)
}

fn stringify_Weekday__alt5(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "FR" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("FR");
    Some(__out)
}

fn stringify_Weekday__alt6(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { if s != "SA" { return None; } } else { return None; }
    let mut __out = String::new();
    __out.push_str("SA");
    Some(__out)
}

fn stringify_Weekday(value: &Value) -> String {
    if let Some(out) = stringify_Weekday__alt0(value) { return out; }
    if let Some(out) = stringify_Weekday__alt1(value) { return out; }
    if let Some(out) = stringify_Weekday__alt2(value) { return out; }
    if let Some(out) = stringify_Weekday__alt3(value) { return out; }
    if let Some(out) = stringify_Weekday__alt4(value) { return out; }
    if let Some(out) = stringify_Weekday__alt5(value) { return out; }
    if let Some(out) = stringify_Weekday__alt6(value) { return out; }
    String::new()
}

fn parse_NumValue__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __n_start = state.pos;
    if state.pos >= state.input.len() || !(is_digit(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_digit(state.input[state.pos])) {
        state.pos += 1;
    }
    let __n_end = state.pos;
    let n: String = state.src[__n_start..__n_end].to_string();
    Some(Value::String(n.clone()))
}

fn parse_NumValue(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_NumValue__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_NumValue__alt0(__value: &Value) -> Option<String> {
    if let Value::String(s) = __value { Some(s.clone()) } else { None }
}

fn stringify_NumValue(value: &Value) -> String {
    if let Some(out) = stringify_NumValue__alt0(value) { return out; }
    String::new()
}

fn parse_Part__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "BYMONTHDAY") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut days: Vec<Value> = Vec::new();
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
        let __iter_snapshot = state.pos;
        let __item = parse_NumValue(state);
        match __item {
            Some(v) => {
                if state.pos == __iter_snapshot {
                    state.pos = __pre_sweep;
                    break;
                }
                days.push(v);
            }
            None => {
                state.pos = __pre_sweep;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    if days.len() < 1 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("bymonthday".to_string())), ("days".to_string(), Value::Array(days.clone()))]))
}

fn parse_Part__alt1(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "BYMONTH") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut months: Vec<Value> = Vec::new();
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
        let __iter_snapshot = state.pos;
        let __item = parse_NumValue(state);
        match __item {
            Some(v) => {
                if state.pos == __iter_snapshot {
                    state.pos = __pre_sweep;
                    break;
                }
                months.push(v);
            }
            None => {
                state.pos = __pre_sweep;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    if months.len() < 1 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("bymonth".to_string())), ("months".to_string(), Value::Array(months.clone()))]))
}

fn parse_Part__alt2(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "BYMINUTE") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut minutes: Vec<Value> = Vec::new();
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
        let __iter_snapshot = state.pos;
        let __item = parse_NumValue(state);
        match __item {
            Some(v) => {
                if state.pos == __iter_snapshot {
                    state.pos = __pre_sweep;
                    break;
                }
                minutes.push(v);
            }
            None => {
                state.pos = __pre_sweep;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    if minutes.len() < 1 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("byminute".to_string())), ("minutes".to_string(), Value::Array(minutes.clone()))]))
}

fn parse_Part__alt3(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "BYHOUR") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut hours: Vec<Value> = Vec::new();
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
        let __iter_snapshot = state.pos;
        let __item = parse_NumValue(state);
        match __item {
            Some(v) => {
                if state.pos == __iter_snapshot {
                    state.pos = __pre_sweep;
                    break;
                }
                hours.push(v);
            }
            None => {
                state.pos = __pre_sweep;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    if hours.len() < 1 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("byhour".to_string())), ("hours".to_string(), Value::Array(hours.clone()))]))
}

fn parse_Part__alt4(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "BYDAY") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut days: Vec<Value> = Vec::new();
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
        let __iter_snapshot = state.pos;
        let __item = parse_Weekday(state);
        match __item {
            Some(v) => {
                if state.pos == __iter_snapshot {
                    state.pos = __pre_sweep;
                    break;
                }
                days.push(v);
            }
            None => {
                state.pos = __pre_sweep;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    if days.len() < 1 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("byday".to_string())), ("days".to_string(), Value::Array(days.clone()))]))
}

fn parse_Part__alt5(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "FREQ") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let value: Value = match parse_FreqValue(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    Some(Value::Object(vec![("type".to_string(), Value::String("freq".to_string())), ("value".to_string(), value.clone())]))
}

fn parse_Part__alt6(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "COUNT") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
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
    Some(Value::Object(vec![("type".to_string(), Value::String("count".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_Part__alt7(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "INTERVAL") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
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
    Some(Value::Object(vec![("type".to_string(), Value::String("interval".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_Part__alt8(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "UNTIL") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
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
    Some(Value::Object(vec![("type".to_string(), Value::String("until".to_string())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_Part__alt9(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "WKST") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let value: Value = match parse_Weekday(state) {
        Some(v) => v,
        None => { state.pos = entry_pos; return None; }
    };
    Some(Value::Object(vec![("type".to_string(), Value::String("wkst".to_string())), ("value".to_string(), value.clone())]))
}

fn parse_Part(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_Part__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Part__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Part__alt2(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Part__alt3(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Part__alt4(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Part__alt5(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Part__alt6(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Part__alt7(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Part__alt8(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Part__alt9(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_Part__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "bymonthday" => (), _ => return None }
    match __value.obj_get("months") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("minutes") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("hours") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("value") { None | Some(Value::Null) => (), _ => return None }
    let days: Option<&Value> = __value.obj_get("days");
    let __s0: String = if let Some(Value::Array(items)) = days { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(","); } __t.push_str(&stringify_NumValue(item)); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("BYMONTHDAY=");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Part__alt1(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "bymonth" => (), _ => return None }
    match __value.obj_get("days") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("minutes") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("hours") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("value") { None | Some(Value::Null) => (), _ => return None }
    let months: Option<&Value> = __value.obj_get("months");
    let __s0: String = if let Some(Value::Array(items)) = months { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(","); } __t.push_str(&stringify_NumValue(item)); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("BYMONTH=");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Part__alt2(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "byminute" => (), _ => return None }
    match __value.obj_get("days") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("months") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("hours") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("value") { None | Some(Value::Null) => (), _ => return None }
    let minutes: Option<&Value> = __value.obj_get("minutes");
    let __s0: String = if let Some(Value::Array(items)) = minutes { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(","); } __t.push_str(&stringify_NumValue(item)); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("BYMINUTE=");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Part__alt3(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "byhour" => (), _ => return None }
    match __value.obj_get("days") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("months") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("minutes") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("value") { None | Some(Value::Null) => (), _ => return None }
    let hours: Option<&Value> = __value.obj_get("hours");
    let __s0: String = if let Some(Value::Array(items)) = hours { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(","); } __t.push_str(&stringify_NumValue(item)); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("BYHOUR=");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Part__alt4(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "byday" => (), _ => return None }
    match __value.obj_get("months") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("minutes") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("hours") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("value") { None | Some(Value::Null) => (), _ => return None }
    let days: Option<&Value> = __value.obj_get("days");
    let __s0: String = if let Some(Value::Array(items)) = days { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(","); } __t.push_str(&stringify_Weekday(item)); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("BYDAY=");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Part__alt5(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "freq" => (), _ => return None }
    match __value.obj_get("days") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("months") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("minutes") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("hours") { None | Some(Value::Null) => (), _ => return None }
    let value: Option<&Value> = __value.obj_get("value");
    let __s0: String = if let Some(inner) = value { stringify_FreqValue(inner) } else { String::new() };
    let mut __out = String::new();
    __out.push_str("FREQ=");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Part__alt6(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "count" => (), _ => return None }
    match __value.obj_get("days") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("months") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("minutes") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("hours") { None | Some(Value::Null) => (), _ => return None }
    let value: Option<&Value> = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("COUNT=");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Part__alt7(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "interval" => (), _ => return None }
    match __value.obj_get("days") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("months") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("minutes") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("hours") { None | Some(Value::Null) => (), _ => return None }
    let value: Option<&Value> = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("INTERVAL=");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Part__alt8(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "until" => (), _ => return None }
    match __value.obj_get("days") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("months") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("minutes") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("hours") { None | Some(Value::Null) => (), _ => return None }
    let value: Option<&Value> = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("UNTIL=");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Part__alt9(__value: &Value) -> Option<String> {
    match __value.obj_get("type") { Some(Value::String(s)) if s == "wkst" => (), _ => return None }
    match __value.obj_get("days") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("months") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("minutes") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("hours") { None | Some(Value::Null) => (), _ => return None }
    let value: Option<&Value> = __value.obj_get("value");
    let __s0: String = if let Some(inner) = value { stringify_Weekday(inner) } else { String::new() };
    let mut __out = String::new();
    __out.push_str("WKST=");
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Part(value: &Value) -> String {
    if let Some(out) = stringify_Part__alt0(value) { return out; }
    if let Some(out) = stringify_Part__alt1(value) { return out; }
    if let Some(out) = stringify_Part__alt2(value) { return out; }
    if let Some(out) = stringify_Part__alt3(value) { return out; }
    if let Some(out) = stringify_Part__alt4(value) { return out; }
    if let Some(out) = stringify_Part__alt5(value) { return out; }
    if let Some(out) = stringify_Part__alt6(value) { return out; }
    if let Some(out) = stringify_Part__alt7(value) { return out; }
    if let Some(out) = stringify_Part__alt8(value) { return out; }
    if let Some(out) = stringify_Part__alt9(value) { return out; }
    String::new()
}

fn parse_Rule__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let mut parts: Vec<Value> = Vec::new();
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
        let __item = parse_Part(state);
        match __item {
            Some(v) => {
                if state.pos == __iter_snapshot {
                    state.pos = __pre_sweep;
                    break;
                }
                parts.push(v);
            }
            None => {
                state.pos = __pre_sweep;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    if parts.len() < 1 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("type".to_string(), Value::String("rule".to_string())), ("parts".to_string(), Value::Array(parts.clone()))]))
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
    let parts: Option<&Value> = __value.obj_get("parts");
    let __s0: String = if let Some(Value::Array(items)) = parts { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(";"); } __t.push_str(&stringify_Part(item)); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Rule(value: &Value) -> String {
    if let Some(out) = stringify_Rule__alt0(value) { return out; }
    String::new()
}

pub fn render(input: &str) -> Result<Value, String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_Rule(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok(result)
}
pub fn render_with_diagnostics(input: &str) -> Result<(Value, Vec<Diagnostic>), String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_Rule(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok((result, state.diagnostics))
}

pub fn stringify(value: &Value) -> String {
    stringify_Rule(value)
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
