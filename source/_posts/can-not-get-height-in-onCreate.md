---
thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190321184908.jpg
title: 为何 Android 在 onCreate 中获取不到宽高
tags: [Android]
date: 2018-08-13
---

经历过一段时间的开发以后，我们都会发现 onCreate() 和 onResume() 里无法获取到 View 的宽高信息，但是为什么呢？明明 setContentView 了不是吗？今天我们就来看一下这个问题。

<!--more-->

具体代码如下：

```java
public class MainActivity extends AppCompatActivity {

    @BindView(R.id.tv_test)
    private TextView mTextView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        mTv.getHeight(); // 0

    }

    @Override
    protected void onResume() {
        super.onResume();
        mTv.getHeight(); // 0
    }

}
```

要弄清这个问题，首先需要知道代码中涉及到的方法具体做了什么工作，以及具体 View 是在什么时候完成测量的。

### setContentView()

很明显，我们在 onCreate() 方法中调用了 setContentView() 方法，而**设置布局**这个动作会给你一种可以获取到宽高的错觉；那么我们从源码的角度来看看，setContentView() 到底干了点什么。

```java
// 1. AppCompatDelegate 的抽象方法，根据注释，会调用到 Activity 的实现方法中
public abstract void setContentView(@LayoutRes int resId);

// 2. Activity 的实现方法
public void setContentView(@LayoutRes int layoutResID) {
    // Window 是一个抽象类，其唯一实现类是 PhoneWindow
    getWindow().setContentView(layoutResID);
    initWindowDecorActionBar();
}

@Override
public void setContentView(int layoutResID) {
    if (mContentParent == null) {
        // 3. 初始化 DecorView
        installDecor();
    } else if (!hasFeature(FEATURE_CONTENT_TRANSITIONS)) {
        mContentParent.removeAllViews();
    }
    ... ...
}

private void installDecor() {
    mForceDecorInstall = false;
    if (mDecor == null) {
        // 4. 第一次加载窗口，mDecor 为空时，生成一个 DecorView 对象
        // generateDecor(-1) : return new DecorView()
        mDecor = generateDecor(-1);
        ... ...
    } else {
        mDecor.setWindow(this);
    }

    if (mContentParent == null) {
        // 5. 初始化父布局
        mContentParent = generateLayout(mDecor);
    }
}

// 继续跟踪到 generateLayout(mDecor) 方法内部
protected ViewGroup generateLayout(DecorView decor) {
    // 此处根据设置的主题进行一些基础设置，没什么决定性作用
    TypedArray a = getWindowStyle();
    ... ...

    // 接下来的一大段代码是根据各种主题设置默认布局，篇幅原因，此处有大量源码删减
    int layoutResource;
    int features = getLocalFeatures();
    if ((features & (1 << FEATURE_SWIPE_TO_DISMISS)) != 0) {
        layoutResource = R.layout.screen_swipe_dismiss;
        setCloseOnSwipeEnabled(true);
    } else if ((features & (1 << FEATURE_NO_TITLE)) == 0) {
        if (mIsFloating) {
            TypedValue res = new TypedValue();
            getContext().getTheme().resolveAttribute(
                R.attr.dialogTitleDecorLayout, res, true);
            layoutResource = res.resourceId;
        } else if ((features & (1 << FEATURE_ACTION_BAR)) != 0) {
            layoutResource = a.getResourceId(
                R.styleable.Window_windowActionBarFullscreenDecorLayout,
                R.layout.screen_action_bar);
        } else {
            layoutResource = R.layout.screen_title;
        }
    } else {
        // 默认布局样式
        layoutResource = R.layout.screen_simple;
    }

    // 6. 重点来了：将对应的布局加载到 DecorView 中
    mDecor.onResourcesLoaded(mLayoutInflater, layoutResource);
    return contentParent;
}

void onResourcesLoaded(LayoutInflater inflater, int layoutResource) {
    // 加载资源文件
    final View root = inflater.inflate(layoutResource, null);
	... ...
    // 7. 将 View 加载到当前 DecorView 中
    addView(root, 0, new ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT));
}

public void addView(View child, int index, LayoutParams params) {
    // 页面发生变化的话，请求重新摆放布局以及重新绘制
    // 注意，此处的 requestLayout 是 View 的方法
    requestLayout();
    invalidate(true);
    addViewInner(child, index, params, false);
}
```

说出来你可能不信，但是 setContentView() 到这里就差不多结束了。

很明显，我们并没有发现任何关于 View 的测量的代码，最后的 requestLayout() 和 invalidate() 也和 View 的 measure() 关系不大，毕竟还没测量，哪里谈得上 layout 和 draw 呢？

所以， setContentView() 和 View 的测量没啥关系，那么在其之后也就自然获取不到 View 宽高的值了。



### 测量流程到底是从哪里开始的

有了上面的经验，我们已经知道，setContentView() 并不会触发 View 的测量，而只是为 DecorView 指定了布局；那么接下来的问题就是，测量流程到底是从哪里开始的呢？

我们简单回顾一下 Activity 的启动流程，然后来找到这个答案。

```java
public void handleMessage(Message msg) {
    switch (msg.what) {
        case LAUNCH_ACTIVITY: {
            // 1. ActivityThread 内部类 H，处理 LAUNCH_ACTIVITY 的消息
            handleLaunchActivity(r, null, "LAUNCH_ACTIVITY");
        } break;
 }

// 2. 直接从 ActivityThread 的 handleLaunchActivity() 开始了
private void handleLaunchActivity(ActivityClientRecord r, Intent customIntent, String reason) {

    // 3. 执行 performLaunchActivity() 方法
    Activity a = performLaunchActivity(r, customIntent);

    if (a != null) {
        r.createdConfig = new Configuration(mConfiguration);
        reportSizeConfigurations(r);
        Bundle oldState = r.state;
        // 4. 执行 handleResumeActivity() 方法
        handleResumeActivity(r.token, false, r.isForward,
                             !r.activity.mFinished && !r.startsNotResumed,
                             r.lastProcessedSeq, reason);
    }
}

// 3. performLaunchActivity()
private Activity performLaunchActivity(ActivityClientRecord r, Intent customIntent) {
    // 基于反射，利用 Instrumentation 对象创建当前 Activity 的实例
    Activity activity = null;
    try {
        java.lang.ClassLoader cl = appContext.getClassLoader();
        activity = mInstrumentation.newActivity(
            cl, component.getClassName(), r.intent);
        StrictMode.incrementExpectedActivityCount(activity.getClass());
        r.intent.setExtrasClassLoader(cl);
        r.intent.prepareToEnterProcess();
        if (r.state != null) {
            r.state.setClassLoader(cl);
        }
    }

    try {
        if (activity != null) {
            // attach() 方法做了一系列最基本的初始化
            activity.attach(appContext, this, getInstrumentation(), r.token,
                            r.ident, app, r.intent, r.activityInfo, title, r.parent,
                            r.embeddedID, r.lastNonConfigurationInstances, config,
                            r.referrer, r.voiceInteractor, window, r.configCallback);

            activity.mCalled = false;
            // 3.1 依然使用 Instrumentation 对象调用 Activity 的 onCreate() 方法
            if (r.isPersistable()) {
                mInstrumentation.callActivityOnCreate(activity, r.state, r.persistentState);
            } else {
                mInstrumentation.callActivityOnCreate(activity, r.state);
            }
            // 强制校验 super 调用
            if (!activity.mCalled) {
                throw new SuperNotCalledException(
                    "Activity " + r.intent.getComponent().toShortString() +
                    " did not call through to super.onCreate()");
            }
        }
    }
    return activity;
}

public void callActivityOnCreate(Activity activity, Bundle icicle,PersistableBundle persistentState) {
    prePerformCreate(activity);
    // 3.2 调用 Activity 的 performCreate() 方法
    activity.performCreate(icicle, persistentState);
    postPerformCreate(activity);
}

// 3.3 最终得以调用到实际实现的 onCreate()
final void performCreate(Bundle icicle, PersistableBundle persistentState) {
    restoreHasCurrentPermissionRequest(icicle);
    onCreate(icicle, persistentState);
    mActivityTransitionState.readState(icicle);
    performCreateCommon();
}

// 4 performLaunchActivity() 执行完毕后，根据代码来看，会继续执行 handleResumeActivity()
// 同样的，这个方法会调用到一个 performResumeActivity()，在该方法内部也会最终执行到 onResume()
 final void handleResumeActivity( ... ... ) {
     // 最终会执行到 onResume()，不是重点
     r = performResumeActivity(token, clearHide, reason);

     if (r != null) {
         final Activity a = r.activity;

         if (r.window == null && !a.mFinished && willBeVisible) {
             r.window = r.activity.getWindow();
             View decor = r.window.getDecorView();
             ViewManager wm = a.getWindowManager();
             // 5. 执行到 WindowManagerImpl 的 addView()
             // 然后会跳转到 WindowManagerGlobal 的 addView()
             if (a.mVisibleFromClient) {
                 if (!a.mWindowAdded) {
                     a.mWindowAdded = true;
                     wm.addView(decor, l);
                 }
             }
         }
     }
 }

public void addView( ... ... ) {
     ViewRootImpl root;
     synchronized (mLock) {
         // 初始化一个 ViewRootImpl 的实例
         root = new ViewRootImpl(view.getContext(), display);
         try {
             // 调用 setView，为 root 布局 setView
             // 其中 view 为传下来的 DecorView 对象
             // 也就是说，实际上根布局并不是我们认为的 DecorView，而是 ViewRootImpl
             root.setView(view, wparams, panelParentView);
         }
     }
}

// 6. 将 DecorView 加载到 WindowManager, View 的绘制流程从此刻才开始
public void setView(View view, WindowManager.LayoutParams attrs, View panelParentView) {
    // 请求对 View 进行测量和绘制
    // 与 setContentView() 不同，此处的方法是 ViewRootImpl 的方法
    requestLayout();
}

@Override
public void requestLayout() {
    if (!mHandlingLayoutInLayoutRequest) {
        checkThread();
        mLayoutRequested = true;
        // 7. 此方法内部有一个 post 了一个 Runnable 对象
        // 在其中又调用一个 doTraversal() 方法；
        // 再之后又会调用到 performTraversals() 方法，然后 View 的测绘流程就从此处开始了
        scheduleTraversals();
    }
}

private void performTraversals() {
	... ...
    // Ask host how big it wants to be
    performMeasure(childWidthMeasureSpec, childHeightMeasureSpec);
    ... ...
    performLayout(lp, mWidth, mHeight);
    ... ...
    performDraw();
    ... ...
}
```



问题到这里就差不多得到了解答，View 的测绘流程是在 performTraversals() 才开始的；而这个方法的调用是在 onResume() 方法之后，所以在 onCreate() 和 onResume() 方法中拿不到 View 的宽高信息也就很容易理解了。


