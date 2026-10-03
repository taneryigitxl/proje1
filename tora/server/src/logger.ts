function write(level: "INFO" | "WARN" | "ERROR", message: string, extra?: unknown) {
  const line = `${new Date().toISOString()} ${level} ${message}`;
  if (extra === undefined) {
    console.log(line);
    return;
  }
  console.log(line, extra);
}

export const logger = {
  info(message: string, extra?: unknown) {
    write("INFO", message, extra);
  },
  warn(message: string, extra?: unknown) {
    write("WARN", message, extra);
  },
  error(message: string, extra?: unknown) {
    write("ERROR", message, extra);
  },
};
