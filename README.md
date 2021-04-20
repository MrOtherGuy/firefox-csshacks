# Collection of random CSS hacks for Firefox

This repository contains various styles to modify appearance of Mozilla Firefox. These stylesheets are mostly self-contained and can be mixed with each other somewhat freely, but there are no promises about compatibility with third-party styles.

In the case that a particular style relies on another style, the fact will be noted at the start of the file that requires so.

Stylesheets in this repository are tested only on Windows 10 and to a lesser amount on Linux. Most of them should also work on OSX and Windows7, but there may be wrong behavior especially when native widgets such as window titlebar or window control buttons are being styled.

# Setup

As an overview, you will make Firefox load two special stylesheets - `userChrome.css` and `userContent.css`. Doing so requires setting a specific preference (see below) and then creating those files inside your Firefox user profile.

The setup is quite straightforward with the exception of how to find the profile folder so pay attention to that.

## Set the pref to load stylesheets

Go to `about:config` and set the pref `toolkit.legacyUserProfileCustomizations.stylesheets` to `true`

After you set this pref, Firefox will try to load `userChrome.css` and `userContent.css` - but those files don't exist yet so now let's create them.

## Setting up files 

### Find the profile folder

First, find your profile folder. While Firefox is running, go to `about:support` and find a `Profile folder` row near the top - there should also be a button labeled "Open folder" next to it. Clicking that button should open the folder in your file manager.

NOTE: On some Firefox versions clicking that button may open the **profiles** folder which houses *all* your profiles. In that case, navigate into the specific folder you wish to modify. `about:support` should still show the correct folder name so refer to that if you need to figure out the what folder you need to open.

The real profile folder should have files like `prefs.js` and `places.sqlite` If you see those two files in the folder, then great! You found the profile folder! Now lets actually create those stylesheet files.

### Creating the stylesheet files

Note: only userChrome.css is mentioned in this section for brevity, but everything regarding that will also apply to userContent.css

Firefox loads `userChrome.css` from `<profileFolder>/chrome/userChrome.css`. That chrome-folder or the stylesheet files do not exist by default.

### Set up files manually

<details>
<summary>Manually copying individual styles directly into userChrome.css is a simple way to do things for better and for worse.</summary>

0. Create a new folder into the profile folder and name it `chrome`
0. Create `userChrome.css` inside that newly created chrome-folder
0. Copy-paste contents of individual .css files from this repository into your userChrome.css file (and save it of course!)
0. If Firefox is running, restart Firefox so that the changes take effect

**Pay attention to the filename** of `userChrome.css` - the file extension must be `.css` and if your file manager is hiding file extensions then you might accidentally create a file named `userChrome.css.txt` and Firefox will not load that.

In the end you should have a folder structure like this:
```
<profile_folder>
|_ chrome
|   |_ userChrome.css
|   |_ userContent.css
|_ extensions
|_ prefs.js
...
all other profile folders and files
...
```

</details>

### Set up files using git

<details>
<summary>Preferred way to do things, since it makes updates easier and makes organizing multiple styles easier.</summary>

Assumes that you have a git client installed, and that you do not already have a chrome folder in your profile. 

0. Open a command prompt / console / terminal and `cd` into the profile folder
0. Clone this repository into the profile folder
    * `git clone https://github.com/MrOtherGuy/firefox-csshacks.git chrome` on command-line
    * This should create a new folder "chrome" into your profile folder with the contents of this repository
    * (**NOTE**: if you already have "chrome" folder, then rename it before cloning. After clone is complete, just copy the *contents* of the old folder into the new chrome folder)
0. (Optional) Make a copy of `userChrome_example.css` and rename the copy to `userChrome.css`
0. `@import` individual style files into your userChrome.css
    * Notice tha any `@import`s must be placed before anything else in whatever file you are using them
    * Check userChrome_example.css for how it uses `@import`
0. If Firefox is running, restart Firefox so that the changes take effect

Afterwards, you can just use `git pull` in the "chrome" folder and it will replace your copies with up-to-date versions. `git pull` won't replace your userChrome.css file so you can safely put your own custom rules into userChrome.css directly and those won't be overwritten when you update.

</details>

# Style categories

The files themselves are only separated to *chrome* and *content* sub-folders. Files have a one or more *tag* applied to them as listed in `tags.csv` file.

You can browse the tag-categorized files by [using this UI](https://mrotherguy.github.io/firefox-csshacks/)

# Usage

Stylesheets are divided in to chrome and content folders. Firefox loads `userChrome.css` into the browser UI and it loads `userContent.css` into the content documents like web pages and built-in or extension pages.

Use stylesheets under "chrome" in `userChrome.css`

Use stylesheets under "content" in `userContent.css`

The above is not a technical requirement but the particular styles *generally* won't do anything when loaded in wrong context. 

You can import the stylesheets with @-rule import like this:

```css
@import url("path/filename.css");
```

A good habit would be to load each separate style without modifications using @import statements, and then apply your own modifications in userChrome.css after all imports. This makes it easier for you to update the files from the repository since your modifications will be preserved.

Example `userChrome.css`:

```css
@import url(chrome/tab_close_button_always_on_hover.css);
@import url(chrome/tab_loading_progress_throbber.css);
@import url(chrome/button_effect_scale_onclick.css);

:root{
  --toolbar-bgcolor: rgb(36,44,59) !important;
  --uc-menu-bkgnd: var(--toolbar-bgcolor);
  --arrowpanel-background: var(--toolbar-bgcolor) !important;
  --autocomplete-popup-background: var(--toolbar-bgcolor) !important;
  --uc-menu-disabled: rgb(90,90,90) !important;
  --lwt-toolbar-field-focus: rgb(36,44,59) !important;
}

``` 

## Important!

Note that all `@import` rules need to be placed before any other rules in the file, including @namespace rules. Additionally, the order of imported files is just as important as the order of rules within one file.

I would strongly advice using @import to include styles instead of copying contents directly to userChrome.css even with just a few file "components". The technical reason for this is that some files rely on @namespace rules and those only apply on file level such that a @namespace applies to every selector in that file (and in that file only). On top of that, @imports make managing multiple files much easier.

## Further miscallaneous notes

Import any *_patch.css files *after* their base stylesheet.
Import the shared window_control_support.css *before* other stylesheets.

Additionally, you are advised to import theme_ files before any other modules.

# Theme

** NOTE ** Theme files are mostly out-of-date as of 2020-05-22

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
