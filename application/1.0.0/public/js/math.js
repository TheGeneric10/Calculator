// public/js/math.js
window.CALC_APP = window.CALC_APP || {};
window.CALC_APP.math = (() => {
  function sanitize(input){
    return String(input).replace(/[^0-9+\-*/().%]/g, "");
  }

  function prettyExpr(s){
    return String(s).replace(/\*/g, "×").replace(/\//g, "÷");
  }

  function unmatchedOpenParens(s){
    const open = (String(s).match(/\(/g) || []).length;
    const close = (String(s).match(/\)/g) || []).length;
    return open - close;
  }

  function normalizeForEval(s){
    // convert percent to /100 safely: "50%" => "(50/100)" , "12.5%" => "(12.5/100)"
    return String(s).replace(/(\d+(\.\d+)?|\))%/g, "($1/100)");
  }

  function safeEvaluate(raw){
    const s = sanitize(raw);
    if (!/^[0-9+\-*/().%]*$/.test(s)) throw new Error("Invalid");
    if (unmatchedOpenParens(s) !== 0) throw new Error("Unbalanced");
    if (/(\*\*|\/\/)/.test(s)) throw new Error("Invalid");

    const normalized = normalizeForEval(s);
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${normalized});`);
    const result = fn();

    if (!Number.isFinite(result)) return result; // may be Infinity
    return Math.round((result + Number.EPSILON) * 1e12) / 1e12;
  }

  function shouldUseSci(n){
    const abs = Math.abs(Number(n));
    return Number.isFinite(abs) && abs >= 1e10;
  }

  function toSciNoPlus(n, decimals = 1){
    const num = Number(n);
    if (!Number.isFinite(num)) return String(num);

    // Use exponential then strip "+"
    const s = num.toExponential(decimals); // e.g. "2.4e+14"
    return s.replace("e+", "e");
  }

  return { sanitize, prettyExpr, unmatchedOpenParens, safeEvaluate, shouldUseSci, toSciNoPlus };
})();
