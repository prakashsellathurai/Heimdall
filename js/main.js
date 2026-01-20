var firstRequest = true;
function startRequest() {
  UpdateIfReady("HN", firstRequest);
  UpdateIfReady("LWN", firstRequest);
  firstRequest = false;
  window.setTimeout(startRequest, 60000);
}

SetInitialOption("HN.RequestInterval", 1200000);
SetInitialOption("LWN.RequestInterval", 1200000);
SetInitialOption("HN.BackgroundTabs", false);

startRequest();
