# Collection of random CSS hacks for Firefox

Stylesheets in this repository are tested only on Windows 10. They should work on current Nightlies but also generally on latest release Firefox unless otherwise noted.

# Loading user*.css files

1. Find your profile folder, if Firefox is running you can find by going to `about:support` and there should be a button with label "Open Folder" under application basics
2. Create a new folder to the profile folder and name it "chrome"
3. `userChrome.css` and `userContent.css` files should be created inside this chrome-folder.

Clone this repository or individual files inside that newly created chrome-folder.
In the end you should have a folder structure like this:

```
<profile_folder>
|_chrome
|   |_chrome
|   |_content
|   |_userChrome.css
|   |_userContent.css
|_extensions
|_prefs.js
...
all other profile folders and files
...
```

In short, create a parent chrome folder to the same directory where `prefs.js` is - the main profile folder. Firefox loads `userContent.css` and `userChrome.css` files only from that non-default chrome-folder.

# Usage

Stylesheets are divided in to chrome and content folders. The difference is that styles inside "content" affect web-pages whereas styles inside "chrome" affect browser UI.

Use stylesheets under "chrome" in `userChrome.css`

Use stylesheets under "content" in `userContent.css`

You can import the stylesheets with @-rule import like this:

```css
@import url("path/filename.css");
```

## Important!

Note that all `@import` rules need to be placed before any other rules in the file, including @namespace rules. Additionally, the order of imported files is just as important as the order of rules within one file.

Import any *_patch.css files *after* their base stylesheet.
Import the shared window_control_support.css *before* other stylesheets.

Additionally, you are advised to import theme_ files before any other modules.

# Theme

Stylesheets prefixed with `theme_` require `theme_color_variables.css` to be imported.

Example userChrome.css resulting in rather complete dark blueish-grey UI:

```css
@import url(theme_color_variables.css);
@import url(theme_sidebar.css);
@import url(theme_toolbars.css);
@import url(theme_popups_and_menus.css);

/* Your other rules here */
```

You can use individual modules from theme such as to only include popups_and_menus. But it would still be required that you import the theme_color_variables.css or you'll have to manually edit all the colors.


Example userChrome.css and userContent.css can be used as is to enable theme + certain features after /chrome and /content folders are copied into your profile.
