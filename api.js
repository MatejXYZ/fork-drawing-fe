const LOCAL_BE_HOSTS = ["10.0.0.9", "127.0.0.1", "localhost"];
export const BE_DOMAIN = LOCAL_BE_HOSTS.includes(window.location.hostname)
  ? "http://10.0.0.9:8080"
  : "https://fork-drawing.onrender.com";

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

export const del = (url) =>
  request(url, {
    method: "DELETE",
  });
