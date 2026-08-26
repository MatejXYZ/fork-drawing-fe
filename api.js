export const BE_DOMAIN = "http://localhost:8080";

const request = async (url, options = {}) => {
  const response = await fetch(`${BE_DOMAIN}${url}`, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response;
};

export const get = (url) => request(url);

export const post = (url, body) =>
  request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

export const patch = (url, body) =>
  request(url, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
