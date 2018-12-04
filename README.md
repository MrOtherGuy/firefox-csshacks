# Collection of random CSS hacks for Firefox

Stylesheets in this repository are tested only on Windows 10. They should work on current Nightlies but also generally on latest release Firefox unless otherwise noted.

# Usage

Use stylesheets under "chrome" in userChrome.css

Use stylesheets under "content" in userContent.css

You can import the stylesheets with @-rule import like this:

```css
@import url("path/filename.css");
```

## Important!

Note that all `@import` rules need to be placed before any other rules in the file.

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
