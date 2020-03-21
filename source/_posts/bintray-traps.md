---
thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20200321200030.jpg
title: Bintray 集成里边那些坑
tags: [Android]
date: 2020-03-21
---



最近工作上开始涉猎 SDK 开发的领域。

这段时间工作下来的感受就是，SDK 开发实际上就是开发开源软件。

<!-- more -->

以前做 App 是为用户写代码，现在做 SDK 是为程序员写代码，其实都是大同小异。

但是毕竟隔行如隔山，很多东西都是以前没有接触过的，踩坑的过程里也积累了些经验。

简单记录一些，这次先说说 bintray 托管。




### 注意点
关于 bintray 具体使用网上很多文章，具体的注册流程我就不赘述了。就算是不看文章，自己上[官网](https://bintray.com/)也能鼓捣个七七八八。

挑着捡着说说集成时候关于配置的注意点。


首先说，不管使用传统的集成方式还是使用第三方工具，都需要配置大量的 gradle 信息。

我不太习惯在 app.gradle 文件里添加大量代码，所以都会**先抽离到 bintrayConfig.gradle 文件中，然后在 app.gradle 中添加依赖**，这里先给大家说明一下。



### 传统方式配置

1、在 project 的 gradle 文件中添加：

```xml
 classpath 'com.jfrog.bintray.gradle:gradle-bintray-plugin:1.4'
 classpath 'com.github.dcendents:android-maven-gradle-plugin:1.4.1'
```

2、之后在你想要发布的 module 的 gradle 文件中添加：

```
apply from: 'bintrayConfig.gradle'
```

3、然后创建这个 `bintrayConfig.gradle` 文件：

```
// 需要添加的依赖
apply plugin: 'com.github.dcendents.android-maven'
apply plugin: 'com.jfrog.bintray'

version = "1.0.0"    //这个是版本号，必须填写
def siteUrl = 'https://github.com/YourGitHubId/Repo' // 项目的主页
def gitUrl = 'https://github.com/YourGitHubId/Repo.git' // Git仓库的url

group = "你的包名" // 这里是groupId ,必须填写  一般填你唯一的包名

install {
    repositories.mavenInstaller {
        // This generates POM.xml with proper parameters
        pom {
            project {
                packaging 'aar'
                // 项目描述，复制我的话，这里需要修改。
                name '测试 bintary 搭配 maven 上传'   //项目描述
                url siteUrl
                // 软件开源协议，现在一般都是Apache License2.0吧，复制我的，这里不需要修改。
                licenses {
                    license {
                        name 'The Apache Software License, Version 2.0'
                        url 'http://www.apache.org/licenses/LICENSE-2.0.txt'
                    }
                }
                //填写开发者基本信息，应该不是必填
                developers {
                    developer {
                        id ''  
                        name ''  
                        email '' 
                    }
                }

                scm {
                    connection gitUrl
                    developerConnection gitUrl
                    url siteUrl
                }
            }
        }
    }
}
// 生成jar包的task，不需要修改。
task sourcesJar(type: Jar) {
    from android.sourceSets.main.java.srcDirs
    classifier = 'sources'
}
// 生成javaDoc的jar，不需要修改
task javadoc(type: Javadoc) {
    options.encoding = "UTF-8"
    source = android.sourceSets.main.java.srcDirs
    classpath += project.files(android.getBootClasspath().join(File.pathSeparator))
}
task javadocJar(type: Jar, dependsOn: javadoc) {
    classifier = 'javadoc'
    from javadoc.destinationDir
}

//下面设置编码格式，重点注意，如果不设置可能会在gradlew install的时候出现GBK编码映射错误
javadoc {
    options {
        encoding "UTF-8"
        charSet 'UTF-8'
        author true
        version true
        links "http://docs.oracle.com/javase/7/docs/api"
        title '这里是 javadoc 的标题，按需修改'  
    }
}

artifacts {
    archives sourcesJar
}

// 生成jar包
task releaseJar(type: Copy) {
    from( 'build/intermediates/bundles/release')
    into( '../jar')
    include('classes.jar')
    rename('classes.jar', 'test-sdk-' + version + '.jar')
}

Properties properties = new Properties()
properties.load(project.rootProject.file('local.properties').newDataInputStream())
bintray {

    //从 local.properties 读取用户名和秘钥
    user = properties.getProperty("bintray.user")
    key = properties.getProperty("bintray.apiKey")

    configurations = ['archives']
    pkg {
        userOrg = "你的 bintray 组织信息"
        repo = "你在 bintray 创建的仓库名称"  
        name = "发布到 bintray 后的文件名称"
        websiteUrl = siteUrl
        vcsUrl = gitUrl
        licenses = ["Apache-2.0"]
        publish = true  // 是否是公开项目
    }
}
```

用户名不说了，秘钥的获取方式是：用户名 -> 编辑资料 -> API KEY

4、完成以后在终端执行：

```
./gradlew install
```

`install` 是上边 bintray.gradle 里边配置的方法，如果报找不到，就看看有没有配置好

5、成功之后就会在 build/output 下看到 arr 文件，再执行：

```
./gradlew bintrayUpload
```

搞定。



### 使用 bintray-release

这个是 GitHub 上一个开源库，本来挺火的，配置简单。

但是升级到 gradle tools 3.1.X, gradle version 4.6+ 后， [novoda](https://github.com/novoda)/**[bintray-release](https://github.com/novoda/bintray-release)**有个严重 bug，导致上传失败。

[com.novoda.gradle.release.AndroidLibrary$LibraryUsage.getGlobalExcludes()Ljava/util/Set #216](https://github.com/novoda/bintray-release/issues/216#issuecomment-404261875)。

网上很多人说用降低 gradle 版本到 version 4.4，或者其他各种方式，但我怎么都搞不好。

[好在找到了另一个方案](https://github.com/StefMa/bintray-release)，亲测可行，测试版本 gradle tools 3.6.1，gradle version 5.6.4。

下边简单记录一下。

1、project 的 gradle 下添加：

```
buildscript {
    repositories {
        jcenter()
        google()
    }
    dependencies {
        // The current version can be found here https://git.io/fNUnx
        classpath "guru.stefma.bintrayrelease:bintrayrelease:$bintrayReleaseVersion"
    }
}
```

2、之后在你想要发布的 module 的 gradle 文件中添加：

```
apply from: 'bintrayConfig.gradle'
```

3、同样的，创建这个 `bintrayConfig.gradle` 文件：

```
// 这里有前置依赖，可以是下面几个的其中一个，我们是在 library 库里引用的，所以没有问题
// com.android.library, java-library, org.jetbrains.kotlin.jvm, kotlin
apply plugin: "guru.stefma.bintrayrelease"

version = "1.0.5"
group = "一般是包名"
androidArtifact { 
    artifactId = "别人添加你这个项目依赖的时候看到的名字"
}
publish {
    userOrg = '你的 bintray 用户名'
    repoName = '上传的 bintray 以后的名字'
    desc = 'this is a simple description'
    website = 'https://github.com/YourGithubID/Repo'
}
```

那个 group 和 artifactId 我看了好多资料也没搞明白，最后自己试了几次才明白的：

```
implementation 'group:artifactId:version' // 是这个结构的
// 比如下边这个
// 发布的时候 group 就是 androidx.core，artifactId 是 core-ktx，version 是 1.2.0
implementation 'androidx.core:core-ktx:1.2.0'
```

4、配置完成以后，在终端执行：

```
./gradlew clean build bintrayUpload -PbintrayUser=BINTRAY_USERNAME -PbintrayKey=BINTRAY_KEY -PdryRun=false
```





### 引入到项目中

如果想直接在 gradle 引用，不做其他配置的话，你的账号应该需要是企业账号。

在你第一次上传完成后，需要 add to JCenter 提交审核，像这样：

[站外图片上传中...(image-4fc8bf-1584791702981)]

过几个小时，通过 jcenter 那边的审核就会在 bintray 上收到 jcenter 那边的同意消息提醒。

然后就可以直接引用了。



如果没有提交到 jcenter 的话，那就需要在 project 的 gradle 下添加 maven 依赖：

```rust
maven { url 'https://你的用户名.bintray.com/你的 repo 目录' }
```

之后再去 module 的 gradle 里边添加依赖，应该就没有问题啦。

大概就这些内容，最后祝大家少出 bug 吧，哈哈。

最后给自己打个广告。

**不写代码的时候我偶尔写写公众号，「谈谈谈钱」，那儿是个完全不一样的世界。**

**欢迎你来看看我，比心~~**