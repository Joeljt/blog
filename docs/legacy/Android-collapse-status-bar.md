---
title: Android 收起通知栏
thumbnails: 
data: 2019-05-13
tags: [Android]
---





点击通知栏RemoteView中的按钮后要收起通知栏，系统默认是不自动收起的，不过没有找到公开的API可以控制通知栏。

在android.app.StatusBarManager里提供了显示和收缩通知栏的方法，但是这个类没有公开，通过反射可以调用。

需要注意的是API LEVEL>16后，对应的方法名称改变了。

 使用此方法时需要再AndroidManifest.xml中添加如下权限

```xml
<uses-permission android:name="android.permission.EXPAND_STATUS_BAR" />
```

```java
private void collapseStatusBar() {
        int currentApiVersion = android.os.Build.VERSION.SDK_INT;
        try {
            Object service = getSystemService("statusbar");
            Class<?> statusbarManager = Class
                    .forName("android.app.StatusBarManager");
            Method collapse = null;
            if (service != null) {
                if (currentApiVersion <= 16) {
                    collapse = statusbarManager.getMethod("collapse");
                } else {
                    collapse = statusbarManager.getMethod("collapsePanels");
                }
                collapse.setAccessible(true);
                collapse.invoke(service);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
```



