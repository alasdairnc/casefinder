export async function withRedisTimeout(
  promise,
  timeoutMs,
  message = "Redis timeout",
) {
  let timerId = null;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timerId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timerId != null) clearTimeout(timerId);
  }
}
