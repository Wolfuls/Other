/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

;// ./src/premium-push-notification/content/notification.types.ts
const DefaultNotificationPermission = "default";
const DeniedNotificationPermission = "denied";
const GrantedNotificationPermission = "granted";

;// ./src/premium-push-notification/content/deny-notifications-requests.ts

const denyNotificationsRequests = function () {
    window.Notification.requestPermission = async function () {
        return await new Promise((resolve) => {
            resolve(window.Notification.permission === DefaultNotificationPermission
                ? GrantedNotificationPermission
                : (/* inlined export .DeniedNotificationPermission */"denied"));
        });
    };
};
denyNotificationsRequests();

/******/ })()
;
//# sourceMappingURL=adblock-deny-push-notifications-requests.js.map