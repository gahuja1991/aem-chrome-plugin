/*
 * #%L
 * AEM Chrome Plug-in
 * %%
 * Copyright (C) 2016 Adobe
 * %%
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * #L%
 */

(function(window,afPlugin){

    /*
     *  This is the list of reserved keywords for adaptive form.
     */
    var keywords = ["initialize", "getOnOffValues", "minOccur", "validate", "setGuideState", "maxOccur",
            "forceElementFocusChange", "getGuideState", "initialOccur", "checkIfNull", "initialize", "instanceTemplateId",
            "playJson", "prepare", "instanceCount", "resetData", "runPendingExpressions", "repeatable", "calcExp",
            "queueExpressions", "instances", "title", "resolveNode", "syncXFAProps", "valueCommitScript", "autoSaveStart",
            "visit", "validateExp", "enableAutoSave", "getElement", "placeholderText", "autoSaveStartExpression", "children",
            "value", "autoSaveInfo", "setAttribute", "formattedValue", "xdpRef", "getGuideProp", "displayPictureClause", "dorTemplateRef",
            "getXFAProp", "validatePictureClause", "actionType", "getAttribute", "editPictureClause", "xsdRef", "name", "mandatory", "panel",
            "templateId", "mandatoryMessage", "multiSelect", "id", "validateExpMessage", "optionsExp", "somExpression", "validatePictureClauseMessage",
            "items", "nonLocalizedTitle", "validationState", "multiSelection", "viewVisited", "width", "buttonText", "index", "height", "showComment",
            "visible", "cssClassName", "fileSizeLimit", "enabled", "clickExp", "fileList", "enableLayoutOptimization", "navigationChangeExp",
            "handleEvent", "dataType", "type", "addInstance", "leadDigits", "showLink", "insertInstance", "fracDigits", "clickStatus", "removeInstance",
            "maxChars", "showAsPopUp", "shortDescription", "execNavigationChangeExpression", "multiLine", "longDescription", "executeExpression", "visibleExp",
            "initScript", "enabledExp", "execCompletion", "sectionId", "setFocus", "completionExp", "sectionTitle", "activeInstance", "completionExpReq",
            "completionScript", "activePart", "toolbar", "completionBeforeMessage", "isLastPart", "instanceManager", "completionAfterMessage", "isFirstPart",
            "instanceIndex", "completionSuccessScript", "currentActivePart", "summary", "completionFailureScript", "sectionName", "submitPassword",
            "initializeChildren", "sectionFields", "fetchedFromService", "repeatablePanelId", "getSelectedIndex", "repeatablePanelPath", "getItemIdentifier",
            "mobileLayout", "columnWidth"],
        keyWordErrorList = [],
        improvementList = [];

    $(document).on("loadAuthoringFrame.afPlugin", function(){

        // empty the existing data in all the tabs.
        $("#authoringTree,#nameError,#labelError,#performanceList,#bindrefErrorList,#noBindrefErrorList,#minOccurErrorList").empty();
        improvementList= [];
        keyWordErrorList = [];

        $("#reloadAuthoringTab").off("click.afPlugin").on('click.afPlugin', function () {
            $(document).trigger("loadAuthoringFrame.afPlugin")
        });

        chrome.devtools.inspectedWindow.eval("window.editorFrameLoaded", function (result) {
            if (result) {
                window.afPlugin.author.createPerformanceTab();
            } else {
                $(document).off("editorLoaded.afPlugin");
                $(document).on("editorLoaded.afPlugin", function () {
                    window.afPlugin.author.createPerformanceTab();
                });
            }
        });
    });

    var afPluginAuthoring = afPlugin.author = {

        manageEmptyContainer: function(elements, childrenSelector) {
          var children = [];

          if(!elements || elements.length === 0) {
            return;
          }

          _.each(elements, function ($el) {
            var elChildren = [];

            if (childrenSelector) {
              elChildren = $el.find(childrenSelector).toArray();
            } else {
              elChildren = $el.children().toArray();
            }

            if (elChildren.length === 0) {
                $el.closest('.hide-on-empty').hide();
            } else {
                $el.closest('.hide-on-empty').show();
            }

            children = children.concat(elChildren);
          });

          if (children.length === 0) {
              elements[0].closest('.emptyable-container').find('.show-on-empty').show();
          } else {
              elements[0].closest('.emptyable-container').find('.show-on-empty').hide();
          }
        },

        createPerformanceTab: function () {
            chrome.devtools.inspectedWindow.eval("window.afPlugin._getTimingMap()", function (result, isException) {
                afPlugin.author.timingMap = result;
                afPluginAuthoring.getContainerJson();
            });
        },

        /*
         *  This function gets the guide container's JSON Model and passes it to create the tree structure.
         */
        getContainerJson: function () {
            var contentPath = window.afPlugin.url.split("editor.html")[1].split(".html")[0],
                url = contentPath + "/jcr:content/guideContainer.infinity.json";
            chrome.devtools.inspectedWindow.eval("window.afPlugin._getJson(" + JSON.stringify(url) + ")", function (result) {
                var rootPanelJson = result.rootPanel;
                if (result.xsdRef || result.xdpRef) {
                    afPluginAuthoring.createBindRefArray(rootPanelJson, contentPath);
                } else {
                    afPluginAuthoring.createAuthoringTree(rootPanelJson, contentPath);
                }
            });
        },

        /*
         *  This function creates an array of all the bindRefs in the data model
         */
        createBindRefArray: function (rootPanelJson, contentPath) {
            chrome.devtools.inspectedWindow.eval("guidelib.touchlib.editLayer.editLayerDataObjects.editLayerDataObjectsTreeComponent.dataModel.JSONdata", function (result) {
                var bindRefArray = [];
                if (result) {
                    afPluginAuthoring.addIdToArray(result, bindRefArray);
                }
                afPlugin.author.bindRefArray = bindRefArray;
                afPluginAuthoring.createAuthoringTree(rootPanelJson, contentPath);
            });
        },

        addIdToArray: function (obj, array) {
            array.push(obj.id);
            if (obj.items) {
                _.each(obj.items, function (value) {
                    afPluginAuthoring.addIdToArray(value, array);
                });
            }
        },

        /*
         *  This function creates the tree for authoring frame. It populates the improvementList and keyWordList.
         */
        createAuthoringTree: function (rootPanelJson, contentPath) {
            var $list = $("<ul/>").addClass('af-tree-ul');
            afPluginAuthoring.buildTreeItem(rootPanelJson, $list, contentPath + "/jcr:content/guideContainer/rootPanel");
            $("#authoringTree").append($list);
            afPluginAuthoring.displayErrorList(keyWordErrorList);
            afPluginAuthoring.displayImprovementList(improvementList);
        },

        addItemToBindRefError: function ($compName, name, path, parent) {
            var $bindRefErrorItem = $("<li/>");
            afPluginAuthoring.createListItemForFocus($bindRefErrorItem, name, path);
            parent.append($bindRefErrorItem);
            $compName.css("color", "red");
        },

        buildTreeItem: function (obj, list, path, flag) {
            var name = obj.name,
                timingMap = afPlugin.author.timingMap,
                $item = $("<li/>"),
                $bindRefErrorItem,
                $panelCount,
                $itemCount,
                dataObj,
                $compName = $("<h3/>").text(obj['jcr:title'] || name).attr('data-name', name).attr('data-path', path).attr("data-bind-ref", obj.bindRef);

            if (obj.minOccur < 1) {
                afPluginAuthoring.addItemToBindRefError($compName, name, path, $("#minOccurErrorList"));
            }

            if (flag) {
                if (_.isUndefined(obj.bindRef)) {
                    afPluginAuthoring.addItemToBindRefError($compName, name, path, $('#noBindrefErrorList'));
                }
            }

            if (obj.bindRef && afPlugin.author.bindRefArray.indexOf(obj.bindRef) < 0) {
                afPluginAuthoring.addItemToBindRefError($compName, name, path, $("#bindrefErrorList"));
            }

            afPluginAuthoring.manageEmptyContainer([$("#minOccurErrorList"), $('#noBindrefErrorList'), $("#bindrefErrorList")], 'li');


            $compName.on("click", afPluginAuthoring.showNodeInfo);

            // add timing info to the list item.
            if (typeof timingMap[path] !== 'undefined') {
                var $totalTime = $("<span class='af-performance-time'/>");
                if (timingMap[path].totalTime < 100) {
                    $totalTime.text(timingMap[path].totalTime + "ms");
                } else {
                    improvementList.push({path: path, name: obj.name});
                    $totalTime.text((timingMap[path].totalTime / 1000).toFixed(2) + "s").addClass("af-performance-slow");
                }
                $compName.append($totalTime);
            }
            $item.append($compName);

            // create tags for panel and item count
            $panelCount = $("<span class='count'/>");
            $item.append($panelCount);

            $itemCount = $("<span class='count'/>");
            $item.append($itemCount);

            if (_.contains(keywords, obj.name)) {
                keyWordErrorList.push({path: path, name: obj.name, prop: "name"});
                $compName.css("color", "red");
            }

            if (_.contains(keywords, obj['jcr:title'])) {
                keyWordErrorList.push({path: path, name: obj.name, prop: "label"});
                $compName.css("color", "red");
            }

            dataObj = afPluginAuthoring.buildTree(obj, $item, path, flag);

            //populate the panel count and item count
            if (dataObj.panelCount !== 0) {
                $panelCount.html("Number of child panels: <strong>" + dataObj.panelCount + "</strong> , ");
            }
            if (dataObj.itemCount !== 0) {
                $itemCount.html("Number of items: <strong>" + dataObj.itemCount + "</strong>");
            }

            list.append($item);
            return dataObj;
        },

        buildTree: function (obj, parent, path, flag) {
            var $ul = $("<ul/>").addClass('af-tree-ul'),
                items,
                returnedDataObject,
                itemPath,
                dataObj = {
                    'panelCount': 0,
                    'itemCount': 0
                };

            flag = flag || (obj.bindRef && (obj.minOccur != 1 || obj.maxOccur != 1));

            path = path + "/items";
            if (!_.isEmpty(obj.items)) {
                items = obj.items;
                _.each(items, function (value, key) {
                    if (_.isObject(value)) {
                        if (value['sling:resourceType'] === "fd/af/components/panel" || value['sling:resourceType'] === "fd/af/components/rootPanel") {
                            dataObj.panelCount++;
                        }
                        dataObj.itemCount++;
                        itemPath = path + "/" + key;

                        returnedDataObject = afPluginAuthoring.buildTreeItem(value, $ul, itemPath, flag);

                        dataObj.panelCount = dataObj.panelCount + returnedDataObject.panelCount;
                        dataObj.itemCount = dataObj.itemCount + returnedDataObject.itemCount;
                    }
                });
                parent.append($ul);
            }

            return dataObj;
        },

        showNodeInfo: function (event) {
            var target = $(event.target),
                path = target.data("path"),
                bindRef = target.data("bind-ref"),
                name = target.data("name");

            chrome.devtools.inspectedWindow.eval("window.afPlugin._setAuthFocus(" + JSON.stringify(path) + ")");
        },


        /*
         * This function populates the keyword error tab based on the list passed.
         */
        displayErrorList: function (list) {

            var $nameErrorDiv = $("#nameError"),
                $labelErrorDiv = $("#labelError");

            _.each(list, function (value) {
                var $item = $("<li></li>");
                afPluginAuthoring.createListItemForFocus($item, value.name, value.path);
                if (value.prop === "name") {
                    $nameErrorDiv.append($item);
                } else {
                    $labelErrorDiv.append($item);
                }
            });

            afPluginAuthoring.manageEmptyContainer([$nameErrorDiv, $labelErrorDiv], 'li');
        },

        /*
         * This function populates the bindRef error tab based on the list passed.
         * */
        displayImprovementList: function (list) {
            var $improvementListDiv = $("#performanceList");
            if (list.length > 0) {
                $improvementListDiv.addClass("active");
                _.each(list, function (value) {
                    var $item = $("<li></li>");
                    afPluginAuthoring.createListItemForFocus($item, value.name, value.path);
                    $improvementListDiv.append($item);
                });
            }
        },

        createListItemForFocus: function (parent, name, path) {
            var $li = parent,
                $errorDetailDiv = $("<div/>");
            $("<div/>").html("Component name: <strong>" + name + "</strong>").appendTo($errorDetailDiv);
            $("<div/>").html("Component path: <strong>" + path + "</strong>").appendTo($errorDetailDiv);
            $li.on("click", function () {
                chrome.devtools.inspectedWindow.eval("window.afPlugin._setAuthFocus(" + JSON.stringify(path) + ")");
            });
            $li.append($errorDetailDiv);
        }
    };

})(window,window.afPlugin);
