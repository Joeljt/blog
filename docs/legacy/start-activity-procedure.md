---
thumbnail: //raw.githubusercontent.com/Joeljt/BlogImage/master/20190410195304.jpg
title: Activity 启动流程
tags: [Android]
date: 2019-08-30
---



当我们调用 startActivity() 的时候，实际上发生了什么？



<!-- more --> 



## 前言

这篇来介绍一下 Activity 启动流程。

这几乎是向高级工程师进阶时无法跳过的一步，整个过程涉及到的知识点也纷繁复杂，加之系统源码在 API23 之后又做过大幅修改，所以大家可能会发现点开不同的文章，贴的源码都不一样，也不知道谁是对的，其实他们都是对的。在这种情况下，在这篇文章中，我们也不打算一堆一堆地贴源码，只能是通过文章梳理出思路，理清脉络，初探系统源码，帮助我们更好地进行应用层的开发。

要理解 Activity 的启动流程，有几个基本的门槛需要了解，虽说不用全部精通吧，但是起码要混个脸熟：

1. Binder 机制
2. Handler 机制 
3. Instrumentation
4. ActivityThread
5. ApplicationThread
6. ActivityManagerService

乍一看这么多没见过的东西，可能都有点慌，我们来一个个的解释一下。




## 门槛简介

### 对 Binder 机制的理解

其实我也不是很懂 Binder 机制，只能差不多说个大概。我们都知道 Android 是基于 Linux 内核的，每个 App 都是一个单独的进程，一些系统服务需要在开机时就初始化好，这些系统应用也是运行在某个进程中的。那我们在 Android 系统中进行的所有操作，都是需要通过这些系统服务来实现的。但是不同的进程间要进行通信，就需要借助特殊的方式。

常见的进程间通信的方式一般包括管道、socket、共享内存等，但是 Android 系统有其特殊性，Binder 机制就是 Android 系统中特有的进程间通信机制，整体设计思想也是面向对象的。Binder 的英文释义为**粘合剂**，这与 Binder 机制的工作原理十分契合。诸如 ActivityManagerService 这种的系统级服务，在系统进程中初始化完成后，通过 Binder 机制配合代理模式，将服务的引用散落在系统的各个 App 进程中，各个 App 的代理引用就用过 Binder 机制与系统进程的实际对象进行了映射和绑定，就实现了**粘合**，也就是面向对象思想的体现。

掉书袋的解释就是，**Binder 本质上就是一种底层的通信机制，与具体的服务没有关系。Binder 机制采用代理设计模式，定义一个抽象接口，Client 和 Server 都实现该接口，Server 端是真正的功能实现，Client 端只是对这些函数远程调用请求的包装，C/S 两端通过 binder 驱动来进行具体的细节交互。**

就好比说，

我其实是个菜鸡，但是满世界给人吹牛说自己技术有多好，等真有复杂的需求了，我其实是把要做的事情打包给认识的大佬，大佬做好之后直接给我，我再直接把成果给人家需求方。

在这个例子中，我就是 Client，大佬就是 Server，我打包资料给他这个动作就是 binder 驱动做的工作，在 binder 机制中，这个过程是通过面向接口的方式完成的。

这么说大家应该对 binder 机制有个大概的认识了，实际上 binder 机制还很复杂，有兴趣的可以拜读一下[这篇文章](https://blog.csdn.net/universus/article/details/6211589)，8 年过去了，还是没人能够超越作者当年的水平……



### Instrumentation

翻译为仪器。每一个应用程序，或者说每一个进程，只有一个 Instrumentation 对象，优先于 application 创建。当前 App 中，每个 activity 内都有对 Instrumentation 对象的引用。Instrumentation 可以理解成应用进程的大管家，Activity 的所有动作，从创建到销毁，实际上都是用 Instrumentation 来操作的。



### ActivityThread

这里就是每个 App 的入口。写太久 Android，大家可能忘记了 Java 程序的入口是 main() 方法，Android 程序的 main() 方法就在 ActivityThread 这个类中。这里就是 App 真正的入口。当开启 App 时，会初始化一个 Looper 对象，调用 attach() 方法，进行 App 的初始化工作，之后就会开启消息循环队列，与 AMS 配合，一起完成 App 的交互管理工作。

ActivityThread 实际上并不是 Thread，它只是运行在主线程，也就是我们常说的 UI 线程中，可以理解成 ActivityThread 是 UI 线程的表现形式。



### ApplicationThread

ApplicationThread 是 ActivityThread 的内部类，实现了 IApplicationThread，通过 ApplicationThreadProxy 代理类来与 ActivityManagerService 进行 binder 通信。简单来说，ActivityManagerService 通过 ApplicationThreadProxy 来与 ApplicationThread 进行 binder 通信，从而执行对 application 以及 activity 的各项操作。



### ActivityManagerService

服务端对象，简称 AMS。AMS 是 Android 中最核心的服务，主要负责系统中四大组件的启动、切换、调度及应用进程的管理和调度等工作，其职责与操作系统中的进程管理和调度模块相类似，因此它在 Android 中非常重要。AMS 主要通过 binder 机制与应用层进行通信，在之前的例子中，AMS 就是在背后处理工作的大佬。



## Activity 启动的大体流程

正如之前所说，系统源码在不同的版本中不完全相同，就我实际翻找来看，目前至少有三个版本的系统源码，所以我们暂时不打算详细了解这部分差异内容，有机会的话，等下次再写篇文章对比。

但是不管怎么说，万变不离其宗，大体的启动流程还是没有发生变化的，今天我们的重点就是这部分内容。

在开始之前，请先允许我高水平地用一句话概括一下 Activity 的启动流程。

**当 startActivity 方法被调用时，首先经由 Instrumentation 类中转，然后在过程中对任务栈等信息进行处理（不同版本源码的区别都在这一步），最终在 AMS 中通过 binder 通信的方式，将启动命令回调到 ApplicationThread 类中进行处理，该类通过 Handler 消息机制发送 LAUNCH_ACTIVITY 的消息并接收处理，最终将启动命令交回给 Instrumentation 处理，利用反射机制初始化待启动 Activity 的实例。**

好了，下面我要开始贴源码了。

1. Activity#startActivity -> Activity#startActivityForResult 

   ```java
   @Override
   public void startActivity(Intent intent) {
     this.startActivity(intent, null);
   }
   
   @Override
   public void startActivity(Intent intent, @Nullable Bundle options) {
     if (options != null) {
       startActivityForResult(intent, -1, options);
     } else {
       // Note we want to go through this call for compatibility with
       // applications that may have overridden the method.
       startActivityForResult(intent, -1);
     }
   }
   
   public void startActivityForResult(@RequiresPermission Intent intent, int requestCode) {
       startActivityForResult(intent, requestCode, null);
   }
   
   public void startActivityForResult(@RequiresPermission Intent intent, int requestCode,
               @Nullable Bundle options) {
       if (mParent == null) {
         Instrumentation.ActivityResult ar =
           mInstrumentation.execStartActivity(
           this, mMainThread.getApplicationThread(), mToken, this,
           intent, requestCode, options);
       } else {
         if (options != null) {
           mParent.startActivityFromChild(this, intent, requestCode, options);
         } else {
           mParent.startActivityFromChild(this, intent, requestCode);
         }
       }
   }
   ```

   我们看源码会发现，当 startActivity 被调用时，实际上在源码层面都是调用了 startActivityForResult，requestCode 传入的值为 -1，这也给我们提了个醒，就是真正调用 startActivityForResult 时，不可以在 requestCode 传入 -1，否则一定拿不到回调。

   我们继续向下看会发现，经过一层层的方法重载，最终在一个 startActivityForResult 方法中，会调用 Instrumentation#execStartActivity，然后正式开启 IPC 之旅。

2. Instrumentation#execStartActivity

   ```java
   public ActivityResult execStartActivity(
     Context who, IBinder contextThread, IBinder token, Activity target,
     Intent intent, int requestCode, Bundle options) {
   
     	// 从上边的调用可以看到，contextThread 传入的值为 mMainThread.getApplicationThread()
     	// 继续探究源码会发现，实际传入的为 ActivityThread 内部类 ApplicationThread 的实例对象
       IApplicationThread whoThread = (IApplicationThread) contextThread;
   
     	// 重点就在这里
       int result = ActivityManager.getService()
         .startActivity(whoThread, who.getBasePackageName(), intent,
                        intent.resolveTypeIfNeeded(who.getContentResolver()),
                        token, target != null ? target.mEmbeddedID : null,
                        requestCode, 0, null, options);
   
       checkStartActivityResult(result, intent);
   
       return null;
   }
   
   ```

   binder 通信就从这个方法开始：

   ```java
   public static IActivityManager getService() {
     	return IActivityManagerSingleton.get();
   }
   
   private static final Singleton<IActivityManager> IActivityManagerSingleton =
       new Singleton<IActivityManager>() {
           @Override
           protected IActivityManager create() {
               final IBinder b =ServiceManager.getService(Context.ACTIVITY_SERVICE);
               final IActivityManager am = IActivityManager.Stub.asInterface(b);
               return am;
           }
   };
   ```

   接触过 AIDL 的朋友可能会对这部分代码相对熟悉，简单来说，就是 ActivityManager.getService() 返回了一个 IActivityManager 的实例对象。可以理解成面向接口编程，接口无法被实例化，所以 getService() 返回的一定是 IActivityManager 的实现类对象。

   这里我们不需要关心 binder 机制是如何实现的，只需要知道这个方法通过 binder 驱动，利用 IActivityManager 与系统进程的 ActivityManagerService 建立了连接，并为我们返回了它的引用即可。也就是说，getService() 方法的返回值就是 AMS 的实例。

   我们再看之前的代码：

   ```java
   int result = ActivityManager.getService().startActivity()
   ```

   很明显，我们的下一站，就是 AMS 的 startActivity() 方法

3. ActivityManagerService#startActivity

   ```java
   @Override
   public final int startActivity( ... ... ) {
     	return startActivityAsUser(... ...);
   }
   ```

   从这一步开始，AMS 就会利用几个管理类来对待启动的 activity 进行一些任务栈、启动模式等的处理。如我们之前所说，不同版本的系统源码正是在这个位置有所区别：

   - API 23 之前，利用 ActivityStackSupervisor、ActivityStack等对任务栈、启动模式等进行处理，启动过程中将当前所在的 Activity 先暂停，判断目标 activity 是否有实例，有则复用，没有就新建，在流程的最后，调用 ActivityStackSupervisor#realStartActivityLocked 方法，回到客户端层，即 ApplicationThread，处理启动逻辑
   - API 28 之前，引入 ActivityStarter 类，它是 AMS 管理 Activity 启动过程的一个管理类，并在 ActivityStackSupervisor 中新增了一些诸如 resolveIntent、resolveActivity 等方法，用来解析待启动的 activity 信息等，在 AMS 旅途的终点同样是 ActivityStackSupervisor#realStartActivityLocked 方法
   - API 28 再次对源码做了修改，Android 9.0 首次引入了事务机制来启动Activity，而以前都是通过主线程，直接 app.thread.scheduleLaunchActivity 调度执行，这是最大的差别

4. ActivityStackSupervisor#realStartActivityLocked

   ```java
   final boolean realStartActivityLocked(... ...) {
     	app.thread.scheduleLaunchActivity(... ...);
   		return true;
   }
   ```

   上面的方法我删减了大量代码，只留下了最关键的一行调用。点进去看，我们会发现 app.thread 是 IApplicationThread 对象，而 IApplicationThread 在 Client 端的实现正是 ApplicationThread，也就是说我们要看 ApplicationThread 的 scheduleLaunchActivity。

5. ApplicationThread#scheduleLaunchActivity

   ```java
   @Override
   public final void scheduleLaunchActivity( ... ...) {
       ActivityClientRecord r = new ActivityClientRecord();
       sendMessage(H.LAUNCH_ACTIVITY, r);
   }
   
   public void handleMessage(Message msg) {
       switch (msg.what) {
           case LAUNCH_ACTIVITY: 
               final ActivityClientRecord r = (ActivityClientRecord) msg.obj;
               handleLaunchActivity(r, null, "LAUNCH_ACTIVITY");
               break;
       }
   }
    
   private void handleLaunchActivity(... ...) {
   		Activity a = performLaunchActivity(... ...);
   }
   
   private Activity performLaunchActivity(ActivityClientRecord r, Intent customIntent) {
     	 Activity activity = null;
        java.lang.ClassLoader cl = appContext.getClassLoader();
        activity = mInstrumentation.newActivity(cl, component.getClassName(), r.intent);
     	 return activity;
   }
   ```

   顺着代码看下来，就会发现，代码经过 IApplicationThread 回调回到 Client 端 ActivityThread 后，发送了 LAUNCH_ACTIVITY 的消息，然后在 Handler 的回调中，调用了 handleLaunchActivity 方法，最后进入了 performLaunchActivity() 方法中。

   在这个方法中，我们会发现目标 activity 的初始化就是在这里完成的，由之前我们提到的 Instrumentation 对象，通过反射的方式进行的初始化。



好了，Activity 启动流程大概就是这样了。



## UI 进程是怎么和服务进程发生绑定的？

如果大家认真走过整个流程，会发现在 Activity 启动的流程中，binder 机制都是单向的。在流程开始时，通过 ActivityManager.getService() 拿到的是 IActivityManager 接口的实现，也就是 Server 端的 AMS 对象；而在流程快要结束，AMS 的工作处理完成后，是通过 IApplicationThread 接口将操作逻辑还给 Client 端的，也就是 ApplicationThread 对象。

那细心的朋友可能就会问，这两个对象又是怎么发生绑定的？我在 Server 端，也就是 AMS 中是怎么知道我对应的 Client 端是谁，我处理完业务后怎么把结果回传给 Client 呢？下面我们就来为大家解答一下这个疑问。

故事的重点就在于 App 的入口，ActivityThread#main()  中。

我们之前说过，在这个 main() 方法中，程序会初始化一个 mainLooper，然后做一些初始化操作，之后就会开启循环队列，等待系统消息的分发处理。但是在这之前，还有一个重要的 attach() 方法，这个方法中就有我们要找的答案。

ActivityThread#main() & ActivityThread#attach()   

```java
public static void main(String[] args) {
  	// 初始化主线程 MainLooper
    Looper.prepareMainLooper();
		
  	// 初始化 ActivityThread 实例，调用 attach 方法，入参 false
    ActivityThread thread = new ActivityThread();
    thread.attach(false);
		
  	// 开启 Looper 循环
    Looper.loop();
  
  	// 主线程 Looper 不可以停止，一旦停止就会抛异常
    throw new RuntimeException("Main thread loop unexpectedly exited");
}

private void attach(boolean system) {
    sCurrentActivityThread = this;
    mSystemThread = system;
  	// 
    if (!system) {
      	IActivityManager mgr = ActivityManager.getService();
      	mgr.attachApplication(mAppThread);
    } else {
      	// 如果是系统进程，那初始化一个 Instrumentation 对象，创建 Context、Application 对象
      	// 调用 application 的 onCreate 方法
        mInstrumentation = new Instrumentation();
        ContextImpl context = ContextImpl.createAppContext(
          this, getSystemContext().mPackageInfo);
        mInitialApplication = context.mPackageInfo.makeApplication(true, null);
        mInitialApplication.onCreate();
    }
}
```

如上所示，在 attach() 方法中，会判断一下当前是否为系统进程，而在 ActivityThread 中调用此方法时，传入的值一律为 false，而在 SystemServer 初始化时才会传入 true。

ActivityThread#systemMain，在 SystemServer#createSystemContext() 中调用：

```java
public static ActivityThread systemMain() {
    ActivityThread thread = new ActivityThread();
    thread.attach(true);
    return thread;
}
```

如果不是系统进程，则会根据 binder 机制，通过 IActivityManager 与 AMS 建立连接，调用  attachApplication 方法，并将 IApplicationThread 实例对象传入 AMS，这样一来，IActivityManager 和 IApplicationThread 就建立了绑定关系。



## Application 又是什么时候初始化的

接下来我们看一下 application 绑定的过程。

```java
// ActivityManagerService#attachApplication
public final void attachApplication(IApplicationThread thread) {
    synchronized (this) {
      int callingPid = Binder.getCallingPid();
      final long origId = Binder.clearCallingIdentity();
      attachApplicationLocked(thread, callingPid);
      Binder.restoreCallingIdentity(origId);
    }
}

// ActivityManagerService#attachApplicationLocked
private boolean attachApplicationLocked(IApplicationThread thread, int pid) {

    if (app.instr != null) {
      thread.bindApplication(processName, appInfo, providers,
                             app.instr.mClass,
                             profilerInfo, app.instr.mArguments,
                             app.instr.mWatcher,
                             app.instr.mUiAutomationConnection, testMode,
                             mBinderTransactionTrackingEnabled, enableTrackAllocation,
                             isRestrictedBackupMode || !normalMode, app.persistent,
                             new Configuration(getGlobalConfiguration()), app.compat,
                             getCommonServicesLocked(app.isolated),
                             mCoreSettingsObserver.getCoreSettingsLocked(),
                             buildSerial);
    } else {
      thread.bindApplication(processName, appInfo, providers, null, profilerInfo,
                             null, null, null, testMode,
                             mBinderTransactionTrackingEnabled, enableTrackAllocation,
                             isRestrictedBackupMode || !normalMode, app.persistent,
                             new Configuration(getGlobalConfiguration()), app.compat,
                             getCommonServicesLocked(app.isolated),
                             mCoreSettingsObserver.getCoreSettingsLocked(),
                             buildSerial);
    }

  	return true;
}

// 很明显，通过 IApplicationThread 又将代码回调到了 Client 端
// ApplicationThread#bindApplication
public final void bindApplication(... ...) {
  	sendMessage(H.BIND_APPLICATION, data);
}

// 根据消息机制，我们在 ActivityThread#H 中寻找消息处理
public void handleMessage(Message msg) {
    case BIND_APPLICATION:
        Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "bindApplication");
        AppBindData data = (AppBindData)msg.obj;
        handleBindApplication(data);
        Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
    break;
}

// ActivityThread#handleBindApplication
private void handleBindApplication(AppBindData data) {

    final InstrumentationInfo ii;
    if (data.instrumentationName != null) {
        ii = new ApplicationPackageManager(null, getPackageManager())
          .getInstrumentationInfo(data.instrumentationName, 0);
    } else {
      	ii = null;
    }

    // 根据上层调用传入的参数，决定初始化 mInstrumentation 实例的方式
  	// 1. 使用 ClassLoader 初始化；2. 直接 new 对象
    if (ii != null) {
        final ApplicationInfo instrApp = new ApplicationInfo();
        ii.copyTo(instrApp);
        instrApp.initForUser(UserHandle.myUserId());
        final LoadedApk pi = getPackageInfo(......);
        final ContextImpl instrContext = ContextImpl.createAppContext(this, pi);

        try {
          final ClassLoader cl = instrContext.getClassLoader();
          mInstrumentation = (Instrumentation)
            cl.loadClass(data.instrumentationName.getClassName()).newInstance();
        } 

        final ComponentName component = new ComponentName(ii.packageName, ii.name);
        mInstrumentation.init(... ...);
    } else {
      	mInstrumentation = new Instrumentation();
    }

    try {
      	// 调用 makeApplication 创建当前 App 的 Application 对象
        Application app = data.info.makeApplication(data.restrictedBackupMode, null);
        mInitialApplication = app; 
      	
      	// 初始化 application 对象后，通过 mInstrumentation 调用 application 的 onCreate 方法
        mInstrumentation.onCreate(data.instrumentationArgs);
        mInstrumentation.callApplicationOnCreate(app);
    }
}

// LoadedApk#makeApplication
public Application makeApplication(boolean forceDefaultAppClass,
                                   Instrumentation instrumentation) {
    if (mApplication != null) {
      return mApplication;
    }

    java.lang.ClassLoader cl = getClassLoader();
    ContextImpl appContext = ContextImpl.createAppContext(mActivityThread, this);
    // 入参的 instrumentation 为 null，使用 ActivityThread 的 mInstrumentation
    app = mActivityThread.mInstrumentation.newApplication(cl, appClass, appContext);
    appContext.setOuterContext(app);

    // 调用时传入的值为 null，所以不会进 if
    if (instrumentation != null) {
      instrumentation.callApplicationOnCreate(app);   
    }

    return app;
}

```

经过层层调用，我们最终发现，Application 的初始化也是通过 Instrumentation 来处理的，现在大家能理解为什么管它叫应用程序的大管家了吧，因为事无巨细，全是它来做的呀！

```java
public Application newApplication(ClassLoader cl, String className, Context context) {
  	return newApplication(cl.loadClass(className), context);
}

static public Application newApplication(Class<?> clazz, Context context){
    Application app = (Application)clazz.newInstance();
    app.attach(context);
    return app;
}
```

我们可以发现，application 实例的创建也是通过反射的方式实现的。

流程走到这里，Application 实例是怎么创建的，C/S 是怎么发生绑定的，整个 App 是怎么被 Instumentation 支配的，大概都已经介绍清楚了。

完结，撒花！！

   

   

   

   