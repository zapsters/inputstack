import * as $ from "jquery";
var alertCount = 0;
var modalAllowClickOut = true;

var modalContainerReference = null;
var modalBackground = null;
var modalReference = null;
var modalButtonsReference = null;

const alertParams = {
  icon: "alert",
  header: "",
  subHeader: "",
  bodyText: "",
  allowClickOff: true,
  // onModalOut: function () {},
  buttons: [
    {
      /* Empty object will default to the dismiss button */
    },
  ],
};

const buttonParams = {
  text: "Dismiss",
  closeModalOnClick: true,
  onClick: () => {},
  class: "secondary",
};

// Icons currently use PixelArtIcons from Gerrit Halfmann found here:
// https://icon-sets.iconify.design/pixelarticons/

debug();
createModalElement();

function createModalElement() {
  if (document.getElementById("modalContainer") == null) {
    $("body").append(
      `<div id="modalContainer" class="modalContainer">
        <div class="modalBackground" id="modalContainer-bg">
          <div class="modal" id="modalContainer-modal}">
            <button class="closeBtn pixelart-icons-font-close-box" id="modalCloseBtn"></button>
            <div id="modalMainContent">
              <icon id="modalIcon"></icon>
              <h2>Header</h2>
              <h3>Subheader</h3>
              <p>bodyText</p>
              <div id="modalMainButtons">
                <button type="button" class="button dismissBtn">Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      </div>`
    );

    modalContainerReference = document.getElementById("modalContainer");
    modalBackground = document.getElementById("modalContainer-bg");
    modalReference = document.getElementById("modalMainContent");
    modalButtonsReference = document.getElementById("modalMainButtons");

    document.getElementById("modalCloseBtn").addEventListener("click", function (e) {
      closeModal();
    });

    modalContainerReference.addEventListener("click", handleModalClickOff);
  }
}

function handleModalClickOff(event) {
  if (
    event.target == modalBackground &&
    $(modalContainerReference).attr("allowClickOff") != "false"
  )
    closeModal();
}

function populateModalElement(customAlertParams) {
  customAlertParams = { ...alertParams, ...customAlertParams };

  $(modalContainerReference).attr("allowClickOff", customAlertParams.allowClickOff);

  // Populate the Icon
  var iconRef = $(modalReference).find("icon");
  iconRef.removeClass();
  iconRef.addClass(`pixelart-icons-font-${customAlertParams.icon}`);

  // Populate Text
  var headerRef = $(modalReference).find("h2");
  var subHeaderRef = $(modalReference).find("h3");
  var bodyTextRef = $(modalReference).find("p");
  headerRef.html(customAlertParams.header);
  subHeaderRef.html(customAlertParams.subHeader);
  bodyTextRef.html(customAlertParams.bodyText);

  // Populate buttons
  $(modalButtonsReference).html("");

  customAlertParams.buttons.forEach((buttonElement, index) => {
    buttonElement = { ...buttonParams, ...buttonElement };
    var buttonElementHtml = `<button type="button" id="button${index}" class="button">${buttonElement.text}</button>`;
    $(modalButtonsReference).append(buttonElementHtml);
    var buttonElementRef = $(`#button${index}`);
    $(buttonElementRef).addClass(`${buttonElement.class}`);
    $(buttonElementRef).attr("closeModalOnClick", buttonElement.closeModalOnClick);
    $(`#button${index}`).on("click", function () {
      buttonElement.onClick();

      if ($(this).attr("closeModalOnClick") == "true") closeModal(customAlertParams);
    });
  });
}

function displayModal() {
  modalContainerReference.classList.remove("out");
  modalContainerReference.classList.add("active");
}
function closeModal() {
  modalContainerReference.classList.add("out");
}

export function generateModalAlert(params) {
  createModalElement();
  populateModalElement(params);
  displayModal();
}

function debug() {
  document.addEventListener("keypress", function (event) {
    switch (event.key) {
      case "~":
        generateModalAlert({});
        break;
      case "!":
        generateModalAlert({
          icon: "subscriptions",
          header: "header",
          subHeader: "mySubtitle",
          bodyText: "myBodyText",
        });
        break;
      case "@":
        generateModalAlert({
          icon: "cake",
          header: "Happy Cake Day!",
          subHeader: "the cake is a lie.",
          bodyText: "Or is it?",
          allowClickOff: false,
        });
        break;
      case "#":
        generateModalAlert({
          icon: "alert",
          header: "headerText",
          subHeader: "subHeaderText",
          bodyText: "",
          allowClickOff: true,
          buttons: [
            {
              closeModalOnClick: false,
            },
          ],
        });
        break;
    }
  });
}
