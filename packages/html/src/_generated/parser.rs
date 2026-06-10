// Auto-generated from packages/html/src/schema.ts
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

fn parse_HtmlDocument__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    Some(Value::Object(vec![("nodeName".to_string(), Value::String("#document".to_string())), ("mode".to_string(), Value::String("no-quirks".to_string())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlDocument(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlDocument__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_HtmlDocument__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("nodeName") { Some(Value::String(s)) if s == "#document" => (), _ => return None }
    match __value.obj_get("mode") { Some(Value::String(s)) if s == "no-quirks" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_HtmlDocument(value: &Value) -> String {
    if let Some(out) = stringify_HtmlDocument__alt0(value) { return out; }
    String::new()
}

fn parse_Doctype__alt0(state: &mut State, entry_pos: usize, keyword: String, name: String) -> Option<Value> {
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("_kind".to_string(), Value::String("doctype".to_string())), ("_keyword".to_string(), Value::String(keyword.clone())), ("nodeName".to_string(), Value::String("#documentType".to_string())), ("name".to_string(), Value::String(name.clone())), ("publicId".to_string(), Value::String("".to_string())), ("systemId".to_string(), Value::String("".to_string())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_Doctype__alt1(state: &mut State, entry_pos: usize, keyword: String, name: String) -> Option<Value> {
    let __diag_snap = state.diagnostics.len();
    state.diagnostics.push(Diagnostic { code: "recovered".to_string(), drop: "incomplete-doctype".to_string(), start: entry_pos, end: state.pos });
    Some(Value::Object(vec![("_kind".to_string(), Value::String("doctype-incomplete".to_string())), ("_keyword".to_string(), Value::String(keyword.clone())), ("nodeName".to_string(), Value::String("#documentType".to_string())), ("name".to_string(), Value::String(name.clone())), ("publicId".to_string(), Value::String("".to_string())), ("systemId".to_string(), Value::String("".to_string())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_Doctype(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    skip_ws(state);
    if !match_literal(state, "<!") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __keyword_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __keyword_end = state.pos;
    let keyword: String = state.src[__keyword_start..__keyword_end].to_string();
    let keyword_lc = keyword.to_lowercase();
    if !(keyword_lc == "doctype") {
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
    let __post_pos = state.pos;
    let mut __peek = state.pos;
    while __peek < state.input.len() {
        let b = state.input[__peek];
        if b == b' ' || b == b'\t' || b == b'\n' || b == b'\r' { __peek += 1; continue; }
        break;
    }
    if __peek <= state.input.len() && state.input[__peek..].starts_with(b">") {
        state.pos = __post_pos;
        if let Some(v) = parse_Doctype__alt0(state, entry_pos, keyword.clone(), name.clone()) { return Some(v); }
    }
    state.pos = __post_pos;
    parse_Doctype__alt1(state, entry_pos, keyword, name)
}

fn stringify_Doctype__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "doctype" => (), _ => return None }
    match __value.obj_get("nodeName") { Some(Value::String(s)) if s == "#documentType" => (), _ => return None }
    match __value.obj_get("publicId") { Some(Value::String(s)) if s == "" => (), _ => return None }
    match __value.obj_get("systemId") { Some(Value::String(s)) if s == "" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    let keyword = __value.obj_get("_keyword");
    let name = __value.obj_get("name");
    let __s0: String = if let Some(Value::String(s)) = keyword { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = name { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<!");
    __out.push_str(&__s0);
    __out.push_str(" ");
    __out.push_str(&__s1);
    __out.push_str(">");
    Some(__out)
}

fn stringify_Doctype__alt1(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "doctype-incomplete" => (), _ => return None }
    match __value.obj_get("nodeName") { Some(Value::String(s)) if s == "#documentType" => (), _ => return None }
    match __value.obj_get("publicId") { Some(Value::String(s)) if s == "" => (), _ => return None }
    match __value.obj_get("systemId") { Some(Value::String(s)) if s == "" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    let keyword = __value.obj_get("_keyword");
    let name = __value.obj_get("name");
    let __s0: String = if let Some(Value::String(s)) = keyword { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = name { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<!");
    __out.push_str(&__s0);
    __out.push_str(" ");
    __out.push_str(&__s1);
    Some(__out)
}

fn stringify_Doctype(value: &Value) -> String {
    if let Some(out) = stringify_Doctype__alt0(value) { return out; }
    if let Some(out) = stringify_Doctype__alt1(value) { return out; }
    String::new()
}

fn parse_Comment__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    if !match_literal(state, "<!--") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __data_start = state.pos;
    let mut __depth: i32 = 0;
    let __stops: &[&[u8]] = &["-->".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
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
    let __data_end = state.pos;
    let __data_ts = __data_start;
    let __data_te = __data_end;
    let data: String = state.src[__data_ts..__data_te].to_string();
    skip_ws(state);
    if !match_literal(state, "-->") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("nodeName".to_string(), Value::String("#comment".to_string())), ("data".to_string(), Value::String(data.clone())), ("parentNode".to_string(), Value::Null)]))
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
    match __value.obj_get("nodeName") { Some(Value::String(s)) if s == "#comment" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    let data = __value.obj_get("data");
    let __s0: String = if let Some(Value::String(s)) = data { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<!--");
    __out.push_str(&__s0);
    __out.push_str("-->");
    Some(__out)
}

fn stringify_Comment(value: &Value) -> String {
    if let Some(out) = stringify_Comment__alt0(value) { return out; }
    String::new()
}

fn parse_HtmlElement__alt0(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "script" || tag_lc == "style" || tag_lc == "textarea" || tag_lc == "title") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __children_start = state.pos;
    while state.pos < state.input.len() {
        if state.input[state.pos..].starts_with("</".as_bytes()) { break; }
        state.pos += 1;
    }
    let __children_end = state.pos;
    let children: String = state.src[__children_start..__children_end].to_string();
    skip_ws(state);
    if !match_literal(state, "</") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __closeTag_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __closeTag_end = state.pos;
    let closeTag: String = state.src[__closeTag_start..__closeTag_end].to_string();
    let closeTag_lc = closeTag.to_lowercase();
    if !(closeTag_lc == "script" || closeTag_lc == "style" || closeTag_lc == "textarea" || closeTag_lc == "title") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-rawtext".to_string())), ("_closeTag".to_string(), Value::String(closeTag.clone())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(vec![Value::Object(vec![("nodeName".to_string(), Value::String("#text".to_string())), ("value".to_string(), Value::String(children.clone())), ("parentNode".to_string(), Value::Null)])])), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt1(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "area" || tag_lc == "base" || tag_lc == "br" || tag_lc == "col" || tag_lc == "embed" || tag_lc == "hr" || tag_lc == "img" || tag_lc == "input" || tag_lc == "link" || tag_lc == "meta" || tag_lc == "param" || tag_lc == "source" || tag_lc == "track" || tag_lc == "wbr") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-void".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(vec![])), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt2(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "area" || tag_lc == "base" || tag_lc == "br" || tag_lc == "col" || tag_lc == "embed" || tag_lc == "hr" || tag_lc == "img" || tag_lc == "input" || tag_lc == "link" || tag_lc == "meta" || tag_lc == "param" || tag_lc == "source" || tag_lc == "track" || tag_lc == "wbr") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, "/>") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-void-selfclose".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(vec![])), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt3(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __diag_snap = state.diagnostics.len();
    if !match_literal(state, "<") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos; state.diagnostics.truncate(__diag_snap); return None;
    }
    skip_ws(state);
    let __tag_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos; state.diagnostics.truncate(__diag_snap); return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __tag_end = state.pos;
    let tag: String = state.src[__tag_start..__tag_end].to_string();
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, "/>") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos; state.diagnostics.truncate(__diag_snap); return None;
    }
    state.diagnostics.push(Diagnostic { code: "recovered".to_string(), drop: "self-closing-element".to_string(), start: entry_pos, end: state.pos });
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-selfclose-recovery".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(vec![])), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt4(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "li") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("</menu>".as_bytes()) || state.input[state.pos..].starts_with("</li>".as_bytes()) || state.input[state.pos..].starts_with("</ol>".as_bytes()) || state.input[state.pos..].starts_with("</ul>".as_bytes()) || state.input[state.pos..].starts_with("<li>".as_bytes()) || state.input[state.pos..].starts_with("<li ".as_bytes()) || state.input[state.pos..].starts_with("<li/".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</li>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-li".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt5(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "dt" || tag_lc == "dd") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("</dt>".as_bytes()) || state.input[state.pos..].starts_with("</dd>".as_bytes()) || state.input[state.pos..].starts_with("</dl>".as_bytes()) || state.input[state.pos..].starts_with("<dt>".as_bytes()) || state.input[state.pos..].starts_with("<dt ".as_bytes()) || state.input[state.pos..].starts_with("<dt/".as_bytes()) || state.input[state.pos..].starts_with("<dd>".as_bytes()) || state.input[state.pos..].starts_with("<dd ".as_bytes()) || state.input[state.pos..].starts_with("<dd/".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</dt>");
    skip_ws(state);
    let _ = match_literal(state, "</dd>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-dt-dd".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt6(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "tr") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("</tbody>".as_bytes()) || state.input[state.pos..].starts_with("</thead>".as_bytes()) || state.input[state.pos..].starts_with("</tfoot>".as_bytes()) || state.input[state.pos..].starts_with("</table>".as_bytes()) || state.input[state.pos..].starts_with("<tbody>".as_bytes()) || state.input[state.pos..].starts_with("<tbody ".as_bytes()) || state.input[state.pos..].starts_with("<thead>".as_bytes()) || state.input[state.pos..].starts_with("<thead ".as_bytes()) || state.input[state.pos..].starts_with("<tfoot>".as_bytes()) || state.input[state.pos..].starts_with("<tfoot ".as_bytes()) || state.input[state.pos..].starts_with("</tr>".as_bytes()) || state.input[state.pos..].starts_with("<tr>".as_bytes()) || state.input[state.pos..].starts_with("<tr ".as_bytes()) || state.input[state.pos..].starts_with("<tr/".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</tr>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-tr".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt7(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "td" || tag_lc == "th") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("</tbody>".as_bytes()) || state.input[state.pos..].starts_with("</thead>".as_bytes()) || state.input[state.pos..].starts_with("</tfoot>".as_bytes()) || state.input[state.pos..].starts_with("</table>".as_bytes()) || state.input[state.pos..].starts_with("<tbody>".as_bytes()) || state.input[state.pos..].starts_with("<tbody ".as_bytes()) || state.input[state.pos..].starts_with("<thead>".as_bytes()) || state.input[state.pos..].starts_with("<thead ".as_bytes()) || state.input[state.pos..].starts_with("<tfoot>".as_bytes()) || state.input[state.pos..].starts_with("<tfoot ".as_bytes()) || state.input[state.pos..].starts_with("</td>".as_bytes()) || state.input[state.pos..].starts_with("</th>".as_bytes()) || state.input[state.pos..].starts_with("</tr>".as_bytes()) || state.input[state.pos..].starts_with("<td>".as_bytes()) || state.input[state.pos..].starts_with("<td ".as_bytes()) || state.input[state.pos..].starts_with("<td/".as_bytes()) || state.input[state.pos..].starts_with("<th>".as_bytes()) || state.input[state.pos..].starts_with("<th ".as_bytes()) || state.input[state.pos..].starts_with("<th/".as_bytes()) || state.input[state.pos..].starts_with("<tr>".as_bytes()) || state.input[state.pos..].starts_with("<tr ".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</td>");
    skip_ws(state);
    let _ = match_literal(state, "</th>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-td-th".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt8(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "p") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("<blockquote>".as_bytes()) || state.input[state.pos..].starts_with("<blockquote ".as_bytes()) || state.input[state.pos..].starts_with("<section>".as_bytes()) || state.input[state.pos..].starts_with("<section ".as_bytes()) || state.input[state.pos..].starts_with("<article>".as_bytes()) || state.input[state.pos..].starts_with("<article ".as_bytes()) || state.input[state.pos..].starts_with("<address>".as_bytes()) || state.input[state.pos..].starts_with("<address ".as_bytes()) || state.input[state.pos..].starts_with("<header>".as_bytes()) || state.input[state.pos..].starts_with("<header ".as_bytes()) || state.input[state.pos..].starts_with("<footer>".as_bytes()) || state.input[state.pos..].starts_with("<footer ".as_bytes()) || state.input[state.pos..].starts_with("<table>".as_bytes()) || state.input[state.pos..].starts_with("<table ".as_bytes()) || state.input[state.pos..].starts_with("<aside>".as_bytes()) || state.input[state.pos..].starts_with("<aside ".as_bytes()) || state.input[state.pos..].starts_with("<form>".as_bytes()) || state.input[state.pos..].starts_with("<form ".as_bytes()) || state.input[state.pos..].starts_with("<div>".as_bytes()) || state.input[state.pos..].starts_with("<div ".as_bytes()) || state.input[state.pos..].starts_with("<pre>".as_bytes()) || state.input[state.pos..].starts_with("<pre ".as_bytes()) || state.input[state.pos..].starts_with("<nav>".as_bytes()) || state.input[state.pos..].starts_with("<nav ".as_bytes()) || state.input[state.pos..].starts_with("</p>".as_bytes()) || state.input[state.pos..].starts_with("<ul>".as_bytes()) || state.input[state.pos..].starts_with("<ul ".as_bytes()) || state.input[state.pos..].starts_with("<ol>".as_bytes()) || state.input[state.pos..].starts_with("<ol ".as_bytes()) || state.input[state.pos..].starts_with("<dl>".as_bytes()) || state.input[state.pos..].starts_with("<dl ".as_bytes()) || state.input[state.pos..].starts_with("<h1>".as_bytes()) || state.input[state.pos..].starts_with("<h1 ".as_bytes()) || state.input[state.pos..].starts_with("<h2>".as_bytes()) || state.input[state.pos..].starts_with("<h2 ".as_bytes()) || state.input[state.pos..].starts_with("<h3>".as_bytes()) || state.input[state.pos..].starts_with("<h3 ".as_bytes()) || state.input[state.pos..].starts_with("<h4>".as_bytes()) || state.input[state.pos..].starts_with("<h4 ".as_bytes()) || state.input[state.pos..].starts_with("<h5>".as_bytes()) || state.input[state.pos..].starts_with("<h5 ".as_bytes()) || state.input[state.pos..].starts_with("<h6>".as_bytes()) || state.input[state.pos..].starts_with("<h6 ".as_bytes()) || state.input[state.pos..].starts_with("<hr>".as_bytes()) || state.input[state.pos..].starts_with("<hr ".as_bytes()) || state.input[state.pos..].starts_with("<hr/".as_bytes()) || state.input[state.pos..].starts_with("<p>".as_bytes()) || state.input[state.pos..].starts_with("<p ".as_bytes()) || state.input[state.pos..].starts_with("<p/".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</p>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-p".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt9(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "option" || tag_lc == "optgroup") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("</optgroup>".as_bytes()) || state.input[state.pos..].starts_with("</datalist>".as_bytes()) || state.input[state.pos..].starts_with("<optgroup>".as_bytes()) || state.input[state.pos..].starts_with("<optgroup ".as_bytes()) || state.input[state.pos..].starts_with("</option>".as_bytes()) || state.input[state.pos..].starts_with("</select>".as_bytes()) || state.input[state.pos..].starts_with("<option>".as_bytes()) || state.input[state.pos..].starts_with("<option ".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</option>");
    skip_ws(state);
    let _ = match_literal(state, "</optgroup>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-option".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt10(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "html") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("</html>".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</html>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-html".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt11(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "head") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("</head>".as_bytes()) || state.input[state.pos..].starts_with("<body>".as_bytes()) || state.input[state.pos..].starts_with("<body ".as_bytes()) || state.input[state.pos..].starts_with("<body/".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</head>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-head".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt12(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "tbody") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("</tbody>".as_bytes()) || state.input[state.pos..].starts_with("</table>".as_bytes()) || state.input[state.pos..].starts_with("<tbody>".as_bytes()) || state.input[state.pos..].starts_with("<tbody ".as_bytes()) || state.input[state.pos..].starts_with("<tfoot>".as_bytes()) || state.input[state.pos..].starts_with("<tfoot ".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</tbody>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-tbody".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt13(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "thead") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("</thead>".as_bytes()) || state.input[state.pos..].starts_with("</table>".as_bytes()) || state.input[state.pos..].starts_with("<tbody>".as_bytes()) || state.input[state.pos..].starts_with("<tbody ".as_bytes()) || state.input[state.pos..].starts_with("<tfoot>".as_bytes()) || state.input[state.pos..].starts_with("<tfoot ".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</thead>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-thead".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt14(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "tfoot") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("</tfoot>".as_bytes()) || state.input[state.pos..].starts_with("</table>".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</tfoot>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-tfoot".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt15(state: &mut State) -> Option<Value> {
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
    let tag_lc = tag.to_lowercase();
    if !(tag_lc == "body") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        if state.pos < state.input.len() {
            let __sb = state.input[state.pos];
            if __sb == 60 && (state.input[state.pos..].starts_with("</body>".as_bytes()) || state.input[state.pos..].starts_with("</html>".as_bytes())) { break; }
        }
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    let _ = match_literal(state, "</body>");
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element-body".to_string())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement__alt16(state: &mut State) -> Option<Value> {
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
    let mut attrs: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item = parse_Attribute(state);
        match __item {
            Some(v) => attrs.push(v),
            None => {
                state.pos = __loop_start;
                break;
            }
        }
        if state.pos == __loop_start { break; }
    }
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let mut children: Vec<Value> = Vec::new();
    loop {
        let __loop_start = state.pos;
        skip_ws(state);
        let __iter_snapshot = state.pos;
        let __item: Option<Value> = 'role: loop {
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Doctype(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_Comment(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_HtmlElement(state) { break 'role Some(v); }
            state.pos = __iter_snapshot;
            if let Some(v) = parse_TextNode(state) { break 'role Some(v); }
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
    skip_ws(state);
    if !match_literal(state, "</") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __closeTag_start = state.pos;
    if state.pos >= state.input.len() || !(is_ident_start(state.input[state.pos])) {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    state.pos += 1;
    while state.pos < state.input.len() && (is_ident_cont(state.input[state.pos])) {
        state.pos += 1;
    }
    let __closeTag_end = state.pos;
    let closeTag: String = state.src[__closeTag_start..__closeTag_end].to_string();
    skip_ws(state);
    if !match_literal(state, ">") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("_kind".to_string(), Value::String("element".to_string())), ("_closeTag".to_string(), Value::String(closeTag.clone())), ("nodeName".to_string(), Value::String(tag.clone())), ("tagName".to_string(), Value::String(tag.clone())), ("namespaceURI".to_string(), Value::String("http://www.w3.org/1999/xhtml".to_string())), ("attrs".to_string(), Value::Array(attrs.clone())), ("childNodes".to_string(), Value::Array(children.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_HtmlElement(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt16(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt5(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt7(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt9(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt4(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt6(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt8(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt10(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt11(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt12(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt13(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt14(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt15(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt2(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_HtmlElement__alt3(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_HtmlElement__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-rawtext" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children: Option<&Value> = None;
    let closeTag = __value.obj_get("_closeTag");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = children { s.clone() } else { String::new() };
    let __s2: String = if let Some(Value::String(s)) = closeTag { s.clone() } else { String::new() };
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

fn stringify_HtmlElement__alt1(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-void" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    __out.push_str(">");
    Some(__out)
}

fn stringify_HtmlElement__alt2(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-void-selfclose" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    __out.push_str(" />");
    Some(__out)
}

fn stringify_HtmlElement__alt3(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-selfclose-recovery" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    __out.push_str("/>");
    Some(__out)
}

fn stringify_HtmlElement__alt4(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-li" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</li>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt5(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-dt-dd" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</dt>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt6(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-tr" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</tr>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt7(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-td-th" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</td>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt8(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-p" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</p>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt9(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-option" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</option>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt10(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-html" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</html>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt11(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-head" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</head>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt12(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-tbody" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</tbody>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt13(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-thead" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</thead>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt14(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-tfoot" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</tfoot>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt15(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element-body" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    match __value.obj_get("_closeTag") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let mut __out = String::new();
    __out.push_str("<");
    __out.push_str(&__s0);
    if !__s1.is_empty() { __out.push_str(">"); }
    __out.push_str(&__s1);
    if !__s1.is_empty() { __out.push_str("</body>"); }
    Some(__out)
}

fn stringify_HtmlElement__alt16(__value: &Value) -> Option<String> {
    match __value.obj_get("_kind") { Some(Value::String(s)) if s == "element" => (), _ => return None }
    match __value.obj_get("namespaceURI") { Some(Value::String(s)) if s == "http://www.w3.org/1999/xhtml" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    let tag = __value.obj_get("nodeName");
    let children = __value.obj_get("childNodes");
    let closeTag = __value.obj_get("_closeTag");
    let __s0: String = if let Some(Value::String(s)) = tag { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::Array(items)) = children { let mut __t = String::new(); for (i, item) in items.iter().enumerate() { if i > 0 { __t.push_str(" "); } __t.push_str(&stringify_Doctype__alt0(item).or_else(|| stringify_Doctype__alt1(item)).or_else(|| stringify_Comment__alt0(item)).or_else(|| stringify_HtmlElement__alt0(item)).or_else(|| stringify_HtmlElement__alt1(item)).or_else(|| stringify_HtmlElement__alt2(item)).or_else(|| stringify_HtmlElement__alt3(item)).or_else(|| stringify_HtmlElement__alt4(item)).or_else(|| stringify_HtmlElement__alt5(item)).or_else(|| stringify_HtmlElement__alt6(item)).or_else(|| stringify_HtmlElement__alt7(item)).or_else(|| stringify_HtmlElement__alt8(item)).or_else(|| stringify_HtmlElement__alt9(item)).or_else(|| stringify_HtmlElement__alt10(item)).or_else(|| stringify_HtmlElement__alt11(item)).or_else(|| stringify_HtmlElement__alt12(item)).or_else(|| stringify_HtmlElement__alt13(item)).or_else(|| stringify_HtmlElement__alt14(item)).or_else(|| stringify_HtmlElement__alt15(item)).or_else(|| stringify_HtmlElement__alt16(item)).or_else(|| stringify_TextNode__alt0(item)).unwrap_or_default()); } __t } else { String::new() };
    let __s2: String = if let Some(Value::String(s)) = closeTag { s.clone() } else { String::new() };
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

fn stringify_HtmlElement(value: &Value) -> String {
    if let Some(out) = stringify_HtmlElement__alt0(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt1(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt2(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt3(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt4(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt5(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt6(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt7(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt8(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt9(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt10(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt11(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt12(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt13(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt14(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt15(value) { return out; }
    if let Some(out) = stringify_HtmlElement__alt16(value) { return out; }
    String::new()
}

fn parse_TextNode__alt0(state: &mut State) -> Option<Value> {
    let entry_pos = state.pos;
    let __value_start = state.pos;
    while state.pos < state.input.len() {
        let __c = state.input[state.pos];
        if __c == 60 { break; }
        state.pos += 1;
    }
    let __value_end = state.pos;
    let value: String = state.src[__value_start..__value_end].to_string();
    Some(Value::Object(vec![("nodeName".to_string(), Value::String("#text".to_string())), ("value".to_string(), Value::String(value.clone())), ("parentNode".to_string(), Value::Null)]))
}

fn parse_TextNode(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_TextNode__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_TextNode__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("nodeName") { Some(Value::String(s)) if s == "#text" => (), _ => return None }
    match __value.obj_get("parentNode") { None | Some(Value::Null) => (), _ => return None }
    let value = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_TextNode(value: &Value) -> String {
    if let Some(out) = stringify_TextNode__alt0(value) { return out; }
    String::new()
}

fn parse_Attribute__alt0(state: &mut State) -> Option<Value> {
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
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "\"") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __value_start = state.pos;
    let mut __depth: i32 = 0;
    let __stops: &[&[u8]] = &["\"".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
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
    if __value_end >= state.input.len() || __depth != 0 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
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
    let value: String = state.src[__value_ts..__value_te].to_string();
    skip_ws(state);
    if !match_literal(state, "\"") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("_quote".to_string(), Value::String("double".to_string())), ("name".to_string(), Value::String(name.clone())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_Attribute__alt1(state: &mut State) -> Option<Value> {
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
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    if !match_literal(state, "'") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __value_start = state.pos;
    let mut __depth: i32 = 0;
    let __stops: &[&[u8]] = &["'".as_bytes()];
    while state.pos < state.input.len() {
        let c = state.input[state.pos];
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
    if __value_end >= state.input.len() || __depth != 0 {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
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
    let value: String = state.src[__value_ts..__value_te].to_string();
    skip_ws(state);
    if !match_literal(state, "'") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    Some(Value::Object(vec![("_quote".to_string(), Value::String("single".to_string())), ("name".to_string(), Value::String(name.clone())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_Attribute__alt2(state: &mut State) -> Option<Value> {
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
    skip_ws(state);
    if !match_literal(state, "=") {
        if state.pos > state.max_pos { state.max_pos = state.pos; }
        state.pos = entry_pos;
        return None;
    }
    skip_ws(state);
    let __value_start = state.pos;
    while state.pos < state.input.len() {
        if state.input[state.pos..].starts_with("/>".as_bytes()) { break; }
        let __c = state.input[state.pos];
        if __c == 34 || __c == 39 || __c == 32 || __c == 9 || __c == 10 || __c == 13 || __c == 12 || __c == 62 { break; }
        state.pos += 1;
    }
    let __value_end = state.pos;
    if __value_end == __value_start { if state.pos > state.max_pos { state.max_pos = state.pos; } state.pos = entry_pos; return None; }
    let value: String = state.src[__value_start..__value_end].to_string();
    Some(Value::Object(vec![("_quote".to_string(), Value::String("none".to_string())), ("name".to_string(), Value::String(name.clone())), ("value".to_string(), Value::String(value.clone()))]))
}

fn parse_Attribute__alt3(state: &mut State) -> Option<Value> {
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
    Some(Value::Object(vec![("name".to_string(), Value::String(name.clone())), ("value".to_string(), Value::String("".to_string()))]))
}

fn parse_Attribute(state: &mut State) -> Option<Value> {
    let snapshot = state.pos;
    if let Some(v) = parse_Attribute__alt0(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Attribute__alt1(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Attribute__alt2(state) {
        return Some(v);
    }
    state.pos = snapshot;
    let snapshot = state.pos;
    if let Some(v) = parse_Attribute__alt3(state) {
        return Some(v);
    }
    state.pos = snapshot;
    None
}

fn stringify_Attribute__alt0(__value: &Value) -> Option<String> {
    match __value.obj_get("_quote") { Some(Value::String(s)) if s == "double" => (), _ => return None }
    let name = __value.obj_get("name");
    let value = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = name { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str("=\"");
    __out.push_str(&__s1);
    __out.push_str("\"");
    Some(__out)
}

fn stringify_Attribute__alt1(__value: &Value) -> Option<String> {
    match __value.obj_get("_quote") { Some(Value::String(s)) if s == "single" => (), _ => return None }
    let name = __value.obj_get("name");
    let value = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = name { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str("='");
    __out.push_str(&__s1);
    __out.push_str("'");
    Some(__out)
}

fn stringify_Attribute__alt2(__value: &Value) -> Option<String> {
    match __value.obj_get("_quote") { Some(Value::String(s)) if s == "none" => (), _ => return None }
    let name = __value.obj_get("name");
    let value = __value.obj_get("value");
    let __s0: String = if let Some(Value::String(s)) = name { s.clone() } else { String::new() };
    let __s1: String = if let Some(Value::String(s)) = value { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    __out.push_str("=");
    __out.push_str(&__s1);
    Some(__out)
}

fn stringify_Attribute__alt3(__value: &Value) -> Option<String> {
    match __value.obj_get("value") { Some(Value::String(s)) if s == "" => (), _ => return None }
    match __value.obj_get("_quote") { None | Some(Value::Null) => (), _ => return None }
    let name = __value.obj_get("name");
    let __s0: String = if let Some(Value::String(s)) = name { s.clone() } else { String::new() };
    let mut __out = String::new();
    __out.push_str(&__s0);
    Some(__out)
}

fn stringify_Attribute(value: &Value) -> String {
    if let Some(out) = stringify_Attribute__alt0(value) { return out; }
    if let Some(out) = stringify_Attribute__alt1(value) { return out; }
    if let Some(out) = stringify_Attribute__alt2(value) { return out; }
    if let Some(out) = stringify_Attribute__alt3(value) { return out; }
    String::new()
}

pub fn render(input: &str) -> Result<Value, String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_HtmlDocument(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok(result)
}
pub fn render_with_diagnostics(input: &str) -> Result<(Value, Vec<Diagnostic>), String> {
    let mut state = State::new(input);
    skip_ws(&mut state);
    let result = parse_HtmlDocument(&mut state).ok_or_else(|| syntax_error(&state))?;
    skip_ws(&mut state);
    if state.pos != state.input.len() {
        return Err(syntax_error(&state));
    }
    Ok((result, state.diagnostics))
}

pub fn stringify(value: &Value) -> String {
    stringify_HtmlDocument(value)
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
