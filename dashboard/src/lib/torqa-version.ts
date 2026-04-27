import pkg from "../../package.json";

export const TORQA_APP_VERSION = typeof pkg.version === "string" ? pkg.version : "0.0.0";
