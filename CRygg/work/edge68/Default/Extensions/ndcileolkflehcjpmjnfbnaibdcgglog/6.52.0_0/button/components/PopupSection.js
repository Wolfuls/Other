/*
 * This file is part of AdBlock  <https://getadblock.com/>,
 * Copyright (C) 2013-present  Adblock, Inc.
 *
 * AdBlock is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * AdBlock is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with AdBlock.  If not, see <http://www.gnu.org/licenses/>.
 */

/* For ESLint: List any global identifiers used in this file below */
/* global browser, DOMPurify translate, sessionStorageGet */

/* eslint-disable import/extensions */
import {
  AI_SUMMARIES_KEY,
  COOKIE_FILTER_KEY,
  DISTRACTIONS_KEY,
  PAGE_INFO_KEY,
  addUserIdToUrl,
  closePopup,
  navigateTo,
  sendMessageWithNoResponse,
} from "../utils.js";

import AiSummariesIcon from "./icons/ai-summaries-icon.js";
import BlockIcon from "./icons/block-distractions.js";
import CookieIcon from "./icons/cookie-icon.js";
import LockIcon from "./icons/lock-icon.js";
import LogoIcon from "./icons/adblock-logo.js";

const aiSummariesIconTemplate = `
  <div aria-hidden="true" class="popup-icon">${AiSummariesIcon}</div>
`;

const blockIconTemplate = `
  <div aria-hidden="true" class="popup-icon">${BlockIcon}</div>
`;

const cookieIconTemplate = `
  <div aria-hidden="true" class="popup-icon">${CookieIcon}</div>
`;

const lockIconTemplate = `
  <div class="popup-icon">${LockIcon}</div>
`;

const logoIconTemplate = `
  <div aria-hidden="true" class="popup-icon">${LogoIcon}</div>
`;

const icons = {
  locked: lockIconTemplate,
  blockedStats: logoIconTemplate,
  aiSummaries: aiSummariesIconTemplate,
  cookieWalls: cookieIconTemplate,
  blockDistractions: blockIconTemplate,
};

const namesToKeys = {
  aiSummaries: AI_SUMMARIES_KEY,
  cookieWalls: COOKIE_FILTER_KEY,
  blockDistractions: DISTRACTIONS_KEY,
};

// Sections with a free toggle, shown to every user they are rolled out to
const freeToggleSections = new Set(["aiSummaries"]);

const urls = {
  [AI_SUMMARIES_KEY]: "adblock-button-ai-summaries-confirm.html",
  [COOKIE_FILTER_KEY]: "adblock-button-cookie-confirm.html",
  [DISTRACTIONS_KEY]: "adblock-button-distractions-confirm.html",
};

const serverLogger = new modulesAsGlobal.ewe.telemetry.ServerLogger("adblock_ui");
const extensionsUIServerLogger = new modulesAsGlobal.ewe.telemetry.ServerLogger("extensions_ui");

// Whether the free AI summaries section is shown: the background only
// reports the list once it is available and rolled out to the user
const isAiSummariesSectionShown = (pageInfo) => Boolean(pageInfo.aiSummaries);

const toggleSubscription = async (key, evt) => {
  if (evt.target.checked) {
    // Turning a list on first shows its confirmation page, which explains
    // the feature and adds the list once the user confirms
    setTimeout(() => navigateTo(urls[key]), 300);
    return;
  }

  await browser.runtime.sendMessage({ command: "unsubscribe", adblockId: key });
  if (key === AI_SUMMARIES_KEY) {
    extensionsUIServerLogger.behavior("ai_summaries_toggled", {
      action: "opted_out",
      source: "popup",
    });
    // The change only takes effect once the page is reloaded, like pausing
    const { id } = sessionStorageGet(PAGE_INFO_KEY);
    browser.tabs.reload(id);
    closePopup();
  }
};

const isSubscriptionActive = function (key) {
  if (key === AI_SUMMARIES_KEY) {
    return Boolean(this.pageInfo.aiSummaries && this.pageInfo.aiSummaries.subscribed);
  }
  return Boolean(this.pageInfo.subscriptions && this.pageInfo.subscriptions[key]);
};

const generateToggle = function (key) {
  const toggle = document.createElement("toggle-button");
  toggle.dataset.name = key;

  if (isSubscriptionActive.call(this, key)) {
    toggle.dataset.isChecked = true;
  }

  toggle.addEventListener("change", toggleSubscription.bind(this, key));
  return toggle;
};

const learnMoreEventNameMap = new Map([
  ["cookieWalls", "skip_cookie_walls_learn_more_clicked"],
  ["blockDistractions", "block_distractions_learn_more_clicked"],
]);

const generateLearnMore = async function (name) {
  const urlToOpen = await addUserIdToUrl("https://getadblock.com/premium/enrollment/");

  const button = document.createElement("button");
  button.innerText = translate("learn_more_without_period");
  button.addEventListener("click", () => {
    serverLogger.behavior(learnMoreEventNameMap.get(name));
    sendMessageWithNoResponse({ command: "openTab", urlToOpen });
    closePopup();
  });

  return button;
};

const actionSectionGenerators = {
  blockedStats() {
    return document.createElement("span");
  },
  aiSummaries() {
    return generateToggle.call(this, AI_SUMMARIES_KEY);
  },
  cookieWalls() {
    return generateToggle.call(this, COOKIE_FILTER_KEY);
  },
  blockDistractions() {
    return generateToggle.call(this, DISTRACTIONS_KEY);
  },
};

const generateTitle = (isActiveSection, { name, title, subtitle }) => {
  const icon = isActiveSection ? icons[name] : icons.locked;
  const iconSpan = document.createElement("div");
  iconSpan.innerHTML = DOMPurify.sanitize(icon);

  const translatedTitle = translate(title);
  const titleSpan = document.createElement("div");
  titleSpan.textContent = translatedTitle;
  titleSpan.classList.add("title");

  // A subtitle is shown under the title, in the same row as the action
  let textSection = titleSpan;
  if (subtitle) {
    const subtitleSpan = document.createElement("div");
    subtitleSpan.textContent = translate(subtitle);
    subtitleSpan.classList.add("subtitle");

    textSection = document.createElement("div");
    textSection.classList.add("title-text");
    textSection.appendChild(titleSpan);
    textSection.appendChild(subtitleSpan);
  }

  const titleWrapper = document.createElement("div");
  titleWrapper.appendChild(iconSpan);
  titleWrapper.appendChild(textSection);
  titleWrapper.classList.add("title-wrapper");

  if (namesToKeys[name]) {
    const titleLabel = document.createElement("label");
    titleLabel.htmlFor = namesToKeys[name];
    titleLabel.appendChild(titleWrapper);

    return titleLabel;
  }

  return titleWrapper;
};

const generateSeparator = () => {
  const separator = document.createElement("div");
  separator.classList.add("inner-separator");
  return separator;
};

export default class PopupSection extends HTMLElement {
  async connectedCallback() {
    this.pageInfo = sessionStorageGet(PAGE_INFO_KEY);
    const { name } = this.dataset;
    const isBlockedStats = name === "blockedStats";
    const isFreeToggleSection = freeToggleSections.has(name);

    if (!this.pageInfo.settings.display_menu_stats && isBlockedStats) {
      this.outerHTML = "";
      return;
    }

    // The free AI summaries section only exists once its filter list is
    // available as a recommended subscription and the option is rolled out
    // to the user
    if (isFreeToggleSection && !isAiSummariesSectionShown(this.pageInfo)) {
      this.outerHTML = "";
      return;
    }

    const isActive = this.pageInfo.activeLicense;
    const isActiveSection = isActive || isBlockedStats || isFreeToggleSection;

    const titleSection = generateTitle(isActiveSection, this.dataset);
    const actionSection = isActiveSection
      ? actionSectionGenerators[name].call(this)
      : await generateLearnMore(name);

    const separator = generateSeparator();

    if (!isActiveSection) {
      this.classList.add("inactive-block");
    }

    const wrapper = document.createElement("div");
    wrapper.appendChild(titleSection);
    wrapper.appendChild(actionSection);
    this.prepend(separator);
    this.prepend(wrapper);

    // The sections are only visible while the extension is active on the
    // page, so the toggle is only reported as shown in that state
    const { paused, domainPaused, disabledSite, whitelisted } = this.pageInfo;
    if (isFreeToggleSection && !paused && !domainPaused && !disabledSite && !whitelisted) {
      extensionsUIServerLogger.behavior("ai_summaries_toggle_shown", { source: "popup" });
    }
  }
}
