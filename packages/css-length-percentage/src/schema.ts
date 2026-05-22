import { $, defineSchema, ex } from "@parser2/parser";

const LENGTH_UNITS = [
  "cap",
  "ch",
  "cm",
  "dvh",
  "dvw",
  "em",
  "ex",
  "ic",
  "in",
  "lh",
  "lvh",
  "lvw",
  "mm",
  "pc",
  "pt",
  "px",
  "q",
  "rem",
  "rlh",
  "svh",
  "svw",
  "vb",
  "vh",
  "vi",
  "vmax",
  "vmin",
  "vw",
] as const;

const LENGTH_FUNCTIONS = ["calc", "clamp", "max", "min"] as const;
const LENGTH_KEYWORDS = [
  "auto",
  "fit-content",
  "max-content",
  "min-content",
] as const;

export default defineSchema({
  rootType: "CssLengthPercentage",
  punctuators: {
    lparen: "(",
    rparen: ")",
    percent: "%",
    delim: ["+", "-", "*", "/", ","],
  },
  tokens: ["number", "string"],
  examples: [
    ex("10px")
      .as("LengthPercentageItem")
      .span("value", "10")
      .number()
      .noWhitespaceAfter()
      .span("unit", "px")
      .ident()
      .css()
      .oneOf(LENGTH_UNITS)
      .structure({ type: "dimension", value: $.value, unit: $.unit })
      .build(),

    ex("-10px")
      .as("LengthPercentageItem")
      .span("-")
      .span("value", "10")
      .number()
      .noWhitespaceAfter()
      .span("unit", "px")
      .ident()
      .css()
      .oneOf(LENGTH_UNITS)
      .structure({ type: "dimension", value: "-10", unit: $.unit })
      .build(),

    ex("50%")
      .as("LengthPercentageItem")
      .span("value", "50")
      .number()
      .noWhitespaceAfter()
      .span("%")
      .structure({ type: "percentage", value: $.value })
      .build(),

    ex("-50%")
      .as("LengthPercentageItem")
      .span("-")
      .span("value", "50")
      .number()
      .noWhitespaceAfter()
      .span("%")
      .structure({ type: "percentage", value: "-50" })
      .build(),

    ex("0")
      .as("LengthPercentageItem")
      .span("value", "0")
      .number()
      .oneOf(["0"])
      .structure({ type: "zero", value: $.value })
      .build(),

    ex("calc(100% - 1rem)")
      .as("LengthPercentageItem")
      .span("name", "calc")
      .ident()
      .css()
      .oneOf(LENGTH_FUNCTIONS)
      .span("(")
      .span("args", "100%", "LengthFunctionToken")
      .repeats({ min: 1 })
      .span(")")
      .structure({ type: "length-function", name: $.name, args: $.args })
      .build(),

    ex("1rem")
      .as("LengthFunctionToken")
      .span("value", "1")
      .number()
      .noWhitespaceAfter()
      .span("unit", "rem")
      .ident()
      .css()
      .oneOf(LENGTH_UNITS)
      .structure({ type: "dimension", value: $.value, unit: $.unit })
      .build(),

    ex("100%")
      .as("LengthFunctionToken")
      .span("value", "100")
      .number()
      .noWhitespaceAfter()
      .span("%")
      .structure({ type: "percentage", value: $.value })
      .build(),

    ex("0")
      .as("LengthFunctionToken")
      .span("value", "0")
      .number()
      .oneOf(["0"])
      .structure({ type: "zero", value: $.value })
      .build(),

    ex("-")
      .as("LengthFunctionToken")
      .span("-")
      .structure({ type: "operator", value: "-" })
      .build(),

    ex("+")
      .as("LengthFunctionToken")
      .span("+")
      .structure({ type: "operator", value: "+" })
      .build(),

    ex("*")
      .as("LengthFunctionToken")
      .span("*")
      .structure({ type: "operator", value: "*" })
      .build(),

    ex("/")
      .as("LengthFunctionToken")
      .span("/")
      .structure({ type: "operator", value: "/" })
      .build(),

    ex(",")
      .as("LengthFunctionToken")
      .span(",")
      .structure({ type: "separator", value: "," })
      .build(),

    ex("var(--space, 1rem)")
      .as("LengthPercentageItem")
      .span("name", "var")
      .ident()
      .css()
      .oneOf(["var"])
      .span("(")
      .span("args", "--space, 1rem")
      .until(")", { rejectSuffix: "," })
      .span(")")
      .structure({ type: "var-function", name: $.name, args: $.args })
      .build(),

    ex("auto")
      .as("LengthPercentageItem")
      .span("value", "auto")
      .ident()
      .css()
      .oneOf(LENGTH_KEYWORDS)
      .structure({ type: "length-keyword", value: $.value })
      .build(),

    ex("10px 20%")
      .as("CssLengthPercentage")
      .span("items", "10px", "LengthPercentageItem")
      .repeats({ min: 1, max: 4 })
      .structure({ type: "css-length-percentage", items: $.items })
      .build(),
  ],
});
