function handler(event) {
  var request = event.request;
  var headers = request.headers;

  // 以下コマンドでuser:passをbase64エンコードし、authStringに設定する
  // echo -n user:pass | base64
  var authString = "Basic dXNlcjpwYXNz";

  if (
    typeof headers.authorization === "undefined" ||
    headers.authorization.value !== authString
  ) {
    return {
      statusCode: 401,
      statusDescription: "Unauthorized",
      headers: { "www-authenticate": { value: "Basic" } }
    };
  }

  return request;
}
