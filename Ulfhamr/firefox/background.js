'use strict';

// Invoke directly inside the click handler to preserve Firefox's user gesture.
browser.action.onClicked.addListener(() => {
  browser.sidebarAction.open().catch(error => {
    console.error('ウールヴハムのサイドバーを開けませんでした。', error);
  });
});
