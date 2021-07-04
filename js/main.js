var firstRequest = true;
function startRequest() {
  UpdateIfReady(firstRequest);
  firstRequest = false;
  window.setTimeout(startRequest, 60000);
}

SetInitialOption("HN.RequestInterval", 1200000);
SetInitialOption("HN.BackgroundTabs", false);

startRequest();
