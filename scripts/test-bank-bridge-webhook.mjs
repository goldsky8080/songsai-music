async function main() {
  const response = await fetch("http://localhost:3301/api/webhooks/sms", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-secret": "songsai-bridge-local-secret",
    },
    body: JSON.stringify({
      message: "[테스트은행] 홍길동 6,100원 입금",
      sender: "15880000",
      receivedAt: new Date().toISOString(),
    }),
  });

  const text = await response.text();
  console.log(text);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
