export const production = false;

export default {
  api: production ? "https://api.bloxpvp.com" : "",
  h_captcha_key: production
    ? "495be111-f6a7-4ca5-9b8f-d0149998a742"
    : "20000000-ffff-ffff-ffff-000000000002",
};
