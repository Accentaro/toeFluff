// Static interface copy checked against the native Settings references.
export const settingsCopy = {
  "content-social": {
    "Sensitive content filters": {
      "footer": "Choose how you want to see image-based media detected by Discord\u2019s sensitive content filters."
    },
    "Direct Message spam": {
      "options": [
        {
          "label": "Filter all",
          "description": "All DMs will be filtered for spam"
        },
        {
          "label": "Filter from non-friends",
          "description": "DMs from non-friends will be filtered for spam"
        },
        {
          "label": "Do not filter",
          "description": "DMs will not be filtered for spam"
        }
      ],
      "footer": "Automatically send DMs that may contain spam into a separate spam inbox."
    },
    "Age-restricted commands": {
      "options": [
        {
          "label": "Enable age-restricted commands",
          "description": "From apps in direct messages"
        }
      ],
      "footer": "This setting applies to all apps. Allows people 18+ to access commands marked as age-restricted in DMs"
    },
    "Activity Sharing": {
      "options": [
        {
          "label": "Share my activity",
          "description": "Share activity information from games and connected apps I use, including when and how I engage."
        }
      ]
    },
    "Automatically share my activity with": {
      "options": [
        {
          "label": "Friends & All Servers",
          "description": "Your activity is shared with friends and any server you join."
        },
        {
          "label": "Friends & Small Servers Only",
          "description": "Your activity is shared with friends and any server you join with 200 or fewer members."
        },
        {
          "label": "Friends Only",
          "description": null,
          "note": "No subtitle in captured native row; do not add one."
        }
      ]
    },
    "Share when I come online": {
      "description": "Allow friends to receive a push notification when you come online."
    }
  },
  "data-privacy": {
    "Use data to improve Discord": {
      "footer": "Allows us to use and process your information to understand and improve our services."
    },
    "Use data to personalise my Discord experience": {
      "footer": "Allows us to use information, such as who you talk to and what games you play, to personalise Discord for you."
    },
    "Use my Discord activity to personalise Sponsored Content": {
      "footer": "Allows us to personalise Sponsored Content, like Quests, using your Discord activity, such as the games you play. If you opt out, you may still see Quests, but they won\u2019t be personalised."
    },
    "Use third-party data to personalise Sponsored Content": {
      "footer": "Allows us to personalise Sponsored Content, like Quests, using data we receive from advertisers and third-party data providers. If you opt out, you may still see Quests, but they won\u2019t be personalised using data from third parties."
    },
    "Request your data": {
      "options": [
        {
          "label": "Request all of my data"
        }
      ]
    },
    "Share my full profile with": {
      "options": [
        {
          "label": "Friends & All Servers",
          "description": "Your full profile is visible to friends and any server you join."
        },
        {
          "label": "Friends & Small Servers Only",
          "description": "Your full profile is visible to friends and any server you join with 200 or fewer members. Everyone else sees a limited version."
        },
        {
          "label": "Friends Only",
          "description": "Your full profile is visible to friends. Everyone else sees a limited version."
        }
      ],
      "footer": "Control who can see your profile info \u2013 like your bio and connected accounts. Activity is shared with friends and the servers you\u2019ve selected in your Content & Social settings."
    },
    "Share when I update my profile": {
      "description": "Allow friends to receive a push notification when you update your profile."
    },
    "Voice privacy": {
      "options": [
        {
          "label": "Enable persistent verification codes",
          "description": "Allow users to save your devices and mark them as verified."
        }
      ],
      "footer": "All of your calls on Discord are end-to-end encrypted no matter what. That means nobody \u2013 not even Discord \u2013 can listen in on your conversations. These settings let you control optional details when verifying our encryption protocol."
    },
    "Policies & disclosures": {
      "options": null
    }
  },
  "accessibility": {
    "Role Colours": {
      "options": [
        "Show role colours in names",
        "Show role colours next to names",
        "Don't show role colours"
      ],
      "footer": "Learn more about role colours and other accessibility settings."
    },
    "Official Messages": {
      "options": [
        "Default",
        "No text colour",
        "No background colour",
        "No styling"
      ],
      "footer": "Choose how official developer messages look on verified servers that support it."
    },
    "Display Name Styles": {
      "footer": "Enable display name styles, including font, effect and colour across Discord."
    },
    "Contrast": {
      "badge": "BETA",
      "footer": "Adjust the contrast between foreground and background colours"
    },
    "Saturation": {
      "badge": "BETA",
      "footer": "Reduce the colour saturation within the application for those with colour sensitivities. This does not affect the saturation of images, videos, role colours or other user-provided content by default."
    },
    "Minimum notification duration": {
      "footer": "Keep pop-up notifications on screen for at least this long. Notifications that already stay longer are unaffected."
    }
  },
  "advanced": {
    "General": {
      "options": [
        {
          "label": "Developer Mode"
        }
      ],
      "footer": "Developer Mode exposes context menu items helpful for people writing apps using the Discord API."
    },
    "LaunchPad": {
      "options": [
        {
          "label": "Full Screen Gesture",
          "description": "Use a global right to left gesture to activate Launch Pad (Please note: This will disable the swipe-to-reply function in chat and require a right edge gesture to drag chats back in due to gesture conflicts)."
        },
        {
          "label": "Right Edge Gesture",
          "description": "Use a global right to left gesture to activate Launch Pad that you activate from the right edge (on Android this may conflict with system gestures if you have them enabled, and while this keeps swipe to reply enabled, there may be conflicts we still need to fix)."
        },
        {
          "label": "Pull Tab",
          "description": "Use a persistent pull tab element on the right of the screen to activate Launch Pad."
        },
        {
          "label": "Disabled",
          "description": "Disable usage of Launch Pad."
        }
      ],
      "footer": "Enables an experimental feature for faster navigation throughout the app. Accessible globally with a gesture or pull-tab UI element."
    }
  },
  "language": {
    "options": [
      {
        "label": "Dansk",
        "description": "Danish",
        "flag": "DK"
      },
      {
        "label": "Deutsch",
        "description": "German",
        "flag": "DE"
      },
      {
        "label": "English, UK",
        "description": "English, UK",
        "flag": "GB"
      },
      {
        "label": "English, US",
        "description": "English, US",
        "flag": "US"
      },
      {
        "label": "Espa\u00f1ol",
        "description": "Spanish",
        "flag": "ES"
      },
      {
        "label": "Espa\u00f1ol, LATAM",
        "description": "Spanish, LATAM",
        "flag": "MX"
      },
      {
        "label": "Fran\u00e7ais",
        "description": "French",
        "flag": "FR"
      },
      {
        "label": "Hrvatski",
        "description": "Croatian",
        "flag": "HR"
      },
      {
        "label": "Italiano",
        "description": "Italian",
        "flag": "IT"
      },
      {
        "label": "Lietuvi\u0161kai",
        "description": "Lithuanian",
        "flag": "LT"
      },
      {
        "label": "Magyar",
        "description": "Hungarian",
        "flag": "HU"
      },
      {
        "label": "Nederlands",
        "description": "Dutch",
        "flag": "NL"
      },
      {
        "label": "Norsk",
        "description": "Norwegian",
        "flag": "NO"
      },
      {
        "label": "Polski",
        "description": "Polish",
        "flag": "PL"
      },
      {
        "label": "Portugu\u00eas do Brasil",
        "description": "Portuguese, Brazilian",
        "flag": "BR"
      },
      {
        "label": "Rom\u00e2n\u0103",
        "description": "Romanian, Romania",
        "flag": "RO"
      },
      {
        "label": "Suomi",
        "description": "Finnish",
        "flag": "FI"
      },
      {
        "label": "Svenska",
        "description": "Swedish",
        "flag": "SE"
      },
      {
        "label": "Ti\u1ebfng Vi\u1ec7t",
        "description": "Vietnamese",
        "flag": "VN"
      },
      {
        "label": "T\u00fcrk\u00e7e",
        "description": "Turkish",
        "flag": "TR"
      },
      {
        "label": "\u010ce\u0161tina",
        "description": "Czech",
        "flag": "CZ"
      },
      {
        "label": "\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac",
        "description": null,
        "flag": "GR"
      }
    ]
  }
}
