// Connection servers used by online mode.
//
// STUN lets most phones find each other directly. TURN relays the game traffic
// when a network blocks direct connections, which is common on mobile data and
// some Wi-Fi. Without a TURN server those players get stuck on "Joining room…".
//
// Free TURN: sign up at https://www.metered.ca/stun-turn, create an app, and copy
// the username and credential from its "TURN Server" page into the entries below.
// These values end up in the public page; that's expected for TURN credentials.
const TURN_USERNAME = "787681c493a3490a7f98704e";
const TURN_CREDENTIAL = "bbztEwv+ZZo3dvHR";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.relay.metered.ca:80" },
  ...(TURN_USERNAME ? [
    { urls: "turn:global.relay.metered.ca:80", username: TURN_USERNAME, credential: TURN_CREDENTIAL },
    { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: TURN_USERNAME, credential: TURN_CREDENTIAL },
    { urls: "turn:global.relay.metered.ca:443", username: TURN_USERNAME, credential: TURN_CREDENTIAL },
    { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: TURN_USERNAME, credential: TURN_CREDENTIAL },
  ] : []),
];
