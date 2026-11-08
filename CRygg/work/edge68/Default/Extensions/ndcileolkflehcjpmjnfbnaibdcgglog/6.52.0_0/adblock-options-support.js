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
/* global selected, browser, initializeProxies, send */

$(async () => {
  await initializeProxies();

  /**
   * Creates a Blob from the debug data object, and downloads it
   * to the desktop
   *
   * @param {any} data the debug data for the extension
   */
  const downloadDebugData = (data) => {
    const myBlob = new Blob([JSON.stringify(data, null, 4)], {
      type: "application/json",
    });
    const blobURL = URL.createObjectURL(myBlob);
    const a = document.createElement("a");
    a.setAttribute("href", blobURL);
    // use the current date & time (without seconds or the timezone) to create
    // a unique file name for the user
    const currentLocalTimeNoSpecialChars = new Date()
      .toISOString()
      .split(".")[0]
      .slice(0, -2)
      .replace(/[-T:]/g, "");
    a.setAttribute("download", `adblock-data-${currentLocalTimeNoSpecialChars}.json`);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobURL);
  };

  $("#debuginfo_link").click(async () => {
    const granted = await browser.permissions.request({ permissions: ["management"] });
    const debugData = await send("getDebugInfo");

    if (granted) {
      // We augment the debug data with a list of all installed extensions here
      // because if the "management" permission is granted in the options page,
      // it is not automatically granted in the background page or service worker.
      // It will be available in the background page after a reload or
      // restart of the service worker.
      const installedExtensionsData = await browser.management.getAll();
      debugData.installedExtensions = installedExtensionsData.map(
        ({ name, id, version, enabled, installType, type }) => ({
          name,
          id,
          version,
          enabled,
          installType,
          type,
        }),
      );
    }

    downloadDebugData(debugData);
  });

  // Populate extension state debug section
  const extensionStateContainer = document.getElementById("extension-state");

  const loadExtensionState = async () => {
    try {
      const state = await send("getAdFilteringState");
      if (!state) {
        extensionStateContainer.textContent = "Failed to load extension state.";
        return;
      }

      const subscriptions = state.subscriptions || [];
      const isMV3 = state.manifestVersion === 3;
      const totalFilters = subscriptions.reduce((sum, sub) => sum + (sub.filterCount ?? 0), 0);

      const makeDefinitionList = (entries) => {
        const list = document.createElement("dl");
        for (const [label, value] of entries) {
          const term = document.createElement("dt");
          term.textContent = label;
          const definition = document.createElement("dd");
          definition.textContent = value;
          list.append(term, definition);
        }
        return list;
      };

      const makeTable = (rows) => {
        const table = document.createElement("table");
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const columns = [
          ["Filter List", ""],
          ["Version", ""],
          ["Filters", "num"],
        ];
        if (isMV3) {
          columns.push(["Rules", "num"]);
        }
        for (const [text, className] of columns) {
          const header = document.createElement("th");
          header.textContent = text;
          if (className) {
            header.className = className;
          }
          headerRow.appendChild(header);
        }
        const tbody = table.createTBody();
        for (const sub of rows) {
          const row = tbody.insertRow();

          const nameCell = row.insertCell();
          nameCell.textContent = sub.title;
          if (isMV3 && sub.rulesetId) {
            const rulesetLabel = document.createElement("small");
            rulesetLabel.textContent = sub.rulesetId;
            nameCell.appendChild(rulesetLabel);
          }

          row.insertCell().textContent = sub.version || "";

          const filtersCell = row.insertCell();
          filtersCell.textContent = (sub.filterCount ?? 0).toLocaleString();
          filtersCell.className = "num";

          if (isMV3) {
            const rulesCell = row.insertCell();
            rulesCell.textContent = (sub.ruleCount ?? 0).toLocaleString();
            rulesCell.className = "num";
          }
        }
        return table;
      };

      const userFiltersValue =
        state.experimentFiltersCount > 0
          ? `${state.userFiltersCount.toLocaleString()} (experimental: ${state.experimentFiltersCount.toLocaleString()})`
          : state.userFiltersCount.toLocaleString();
      const totals = [
        ["Filters", totalFilters.toLocaleString()],
        ["User Filters", userFiltersValue],
      ];
      if (isMV3) {
        const totalRules = subscriptions.reduce((sum, sub) => sum + (sub.ruleCount ?? 0), 0);
        const enabledRulesets = subscriptions.filter((sub) => sub.rulesetId).length;
        totals.push(
          ["Static Rules", totalRules.toLocaleString()],
          [
            "Static Rulesets",
            `${enabledRulesets.toLocaleString()} of ${state.maxEnabledRulesets.toLocaleString()}`,
          ],
          [
            "Dynamic Rules",
            `${state.dnrDynamicRulesCount.toLocaleString()} of ${state.maxDynamicRules.toLocaleString()}`,
          ],
        );
      }

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "copy-button btn";
      copyButton.textContent = "Copy";
      copyButton.addEventListener("click", async () => {
        const lines = [...totals.map(([key, value]) => `${key}\t${value}`), ""];
        const headers = ["Filter List", "Version", "Filters"];
        if (isMV3) {
          headers.push("Rules");
        }
        lines.push(headers.join("\t"));
        for (const sub of subscriptions) {
          const values = [sub.title, sub.version || "", sub.filterCount ?? 0];
          if (isMV3) {
            values.push(sub.ruleCount ?? 0);
          }
          lines.push(values.join("\t"));
        }
        const originalText = copyButton.textContent;
        try {
          await navigator.clipboard.writeText(lines.join("\n"));
          copyButton.textContent = "Copied!";
        } catch (err) {
          copyButton.textContent = "Failed to copy";
          modulesAsGlobal.ewe.sentry.reportError(err);
        }
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 1500);
      });

      extensionStateContainer.replaceChildren(
        makeDefinitionList(totals),
        makeTable(subscriptions),
        copyButton,
      );
    } catch (error) {
      extensionStateContainer.textContent = "Failed to load extension state.";
      modulesAsGlobal.ewe.sentry.reportError(error);
    }
  };

  loadExtensionState();
  document.addEventListener("tabActivated", (e) => {
    if (e.detail.tabId === "support") {
      loadExtensionState();
    }
  });

  selected("#whatsnew_link", () => {
    fetch(browser.runtime.getURL("RELEASE_NOTES.md"))
      .then((response) => response.text())
      .then((text) => {
        const unreleasedSection = "# Unreleased";
        let cleanedText = text;

        if (text.startsWith(unreleasedSection)) {
          const firstReleaseIndex = text.indexOf("#", unreleasedSection.length);
          if (firstReleaseIndex !== -1) {
            cleanedText = text.slice(firstReleaseIndex);
          }
        }

        $("#changes").text(cleanedText).fadeIn();
        $("body, html").animate(
          {
            scrollTop: $("#changes").offset().top,
          },
          1000,
        );
      });
  });
});
