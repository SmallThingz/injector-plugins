(()=>{var Ai=Object.defineProperty;var Ni=(e)=>e;function Li(e,t){this[e]=Ni.bind(null,t)}var Mi=(e,t)=>{for(var n in t)Ai(e,n,{get:t[n],enumerable:!0,configurable:!0,set:Li.bind(t,n)})};var jt={};Mi(jt,{ArtMethod:()=>Ln,ArtStackVisitor:()=>qr,DVM_JNI_ENV_OFFSET_SELF:()=>Vr,HandleVector:()=>ct,VariableSizedHandleScope:()=>dt,backtrace:()=>kn,deoptimizeBootImage:()=>Fn,deoptimizeEverything:()=>Pn,deoptimizeMethod:()=>Rn,ensureClassInitialized:()=>el,getAndroidApiLevel:()=>ee,getAndroidVersion:()=>lt,getApi:()=>B,getArtApexVersion:()=>Sn,getArtClassSpec:()=>In,getArtFieldSpec:()=>Mt,getArtMethodSpec:()=>pe,getArtThreadFromEnv:()=>kt,getArtThreadSpec:()=>qe,isMethodDeoptimized:()=>Dn,makeArtClassLoaderVisitor:()=>Nn,makeArtClassVisitor:()=>An,makeMethodMangler:()=>Zl,makeObjectVisitorPredicate:()=>Vn,revertGlobalPatches:()=>xn,translateMethod:()=>Wl,withAllArtThreadsSuspended:()=>Tn,withRunnableArtThread:()=>he});var{pageSize:Gt,pointerSize:ki}=Process;class Er{constructor(e){this.sliceSize=e,this.slicesPerPage=Gt/e,this.pages=[],this.free=[]}allocateSlice(e,t){let n=e.near===void 0,r=t===1;if(n&&r){let o=this.free.pop();if(o!==void 0)return o}else if(t<Gt){let{free:o}=this,i=o.length,s=r?null:ptr(t-1);for(let l=0;l!==i;l++){let a=o[l],c=n||this._isSliceNear(a,e),d=r||a.and(s).isNull();if(c&&d)return o.splice(l,1)[0]}}return this._allocatePage(e)}_allocatePage(e){let t=Memory.alloc(Gt,e),{sliceSize:n,slicesPerPage:r}=this;for(let o=1;o!==r;o++){let i=t.add(o*n);this.free.push(i)}return this.pages.push(t),t}_isSliceNear(e,t){let n=e.add(this.sliceSize),{near:r,maxDistance:o}=t,i=yr(r.sub(e)),s=yr(r.sub(n));return i.compare(o)<=0&&s.compare(o)<=0}freeSlice(e){this.free.push(e)}}function yr(e){let t=ki===4?31:63,n=ptr(1).shl(t).not();return e.and(n)}function $t(e){return new Er(e)}var bt=0;function ce(e,t){if(t!==0)throw Error(e+" failed: "+t)}var yt={v1_0:805371904,v1_2:805372416},Et={canTagObjects:1},{pointerSize:xi}=Process,ji={exceptions:"propagate"};function Ae(e,t){this.handle=e,this.vm=t,this.vtable=e.readPointer()}Ae.prototype.deallocate=nt(47,"int32",["pointer","pointer"],function(e,t){return e(this.handle,t)});Ae.prototype.getLoadedClasses=nt(78,"int32",["pointer","pointer","pointer"],function(e,t,n){let r=e(this.handle,t,n);ce("EnvJvmti::getLoadedClasses",r)});Ae.prototype.iterateOverInstancesOfClass=nt(112,"int32",["pointer","pointer","int","pointer","pointer"],function(e,t,n,r,o){let i=e(this.handle,t,n,r,o);ce("EnvJvmti::iterateOverInstancesOfClass",i)});Ae.prototype.getObjectsWithTags=nt(114,"int32",["pointer","int","pointer","pointer","pointer","pointer"],function(e,t,n,r,o,i){let s=e(this.handle,t,n,r,o,i);ce("EnvJvmti::getObjectsWithTags",s)});Ae.prototype.addCapabilities=nt(142,"int32",["pointer","pointer"],function(e,t){return e(this.handle,t)});function nt(e,t,n,r){let o=null;return function(){if(o===null)o=new NativeFunction(this.vtable.add((e-1)*xi).readPointer(),t,n,ji);let i=[o];return i=i.concat.apply(i,arguments),r.apply(this,i)}}function Ne(e,t,{limit:n}){let r=e,o=null;for(let i=0;i!==n;i++){let s=Instruction.parse(r),l=t(s,o);if(l!==null)return l;r=s.next,o=s}return null}function se(e){let t=null,n=!1;return function(...r){if(!n)t=e(...r),n=!0;return t}}function b(e,t){this.handle=e,this.vm=t}var vt=Process.pointerSize,je=2,Oi=28,Ri=34,Pi=37,Fi=40,Di=43,Ui=46,zi=49,Vi=52,Bi=55,Ji=58,Gi=61,$i=64,Hi=67,Zi=70,Wi=73,qi=76,Ki=79,Qi=82,Xi=85,Yi=88,es=91,ts=114,ns=117,rs=120,os=123,is=126,ss=129,as=132,ls=135,cs=138,ds=141,us=95,ps=96,hs=97,fs=98,_s=99,ms=100,gs=101,bs=102,ys=103,Es=104,vs=105,Ss=106,ws=107,Is=108,Cs=109,Ts=110,As=111,Ns=112,Ls=145,Ms=146,ks=147,xs=148,js=149,Os=150,Rs=151,Ps=152,Fs=153,Ds=154,Us=155,zs=156,Vs=157,Bs=158,Js=159,Gs=160,$s=161,Hs=162,Zs={pointer:Ri,uint8:Pi,int8:Fi,uint16:Di,int16:Ui,int32:zi,int64:Vi,float:Bi,double:Ji,void:Gi},Ws={pointer:$i,uint8:Hi,int8:Zi,uint16:Wi,int16:qi,int32:Ki,int64:Qi,float:Xi,double:Yi,void:es},qs={pointer:ts,uint8:ns,int8:rs,uint16:os,int16:is,int32:ss,int64:as,float:ls,double:cs,void:ds},Ks={pointer:us,uint8:ps,int8:hs,uint16:fs,int16:_s,int32:ms,int64:gs,float:bs,double:ys},Qs={pointer:Es,uint8:vs,int8:Ss,uint16:ws,int16:Is,int32:Cs,int64:Ts,float:As,double:Ns},Xs={pointer:Ls,uint8:Ms,int8:ks,uint16:xs,int16:js,int32:Os,int64:Rs,float:Ps,double:Fs},Ys={pointer:Ds,uint8:Us,int8:zs,uint16:Vs,int16:Bs,int32:Js,int64:Gs,float:$s,double:Hs},Sr={exceptions:"propagate"},Ht=null,rn=[];b.dispose=function(e){rn.forEach(e.deleteGlobalRef,e),rn=[]};function De(e){return rn.push(e),e}function St(e){if(Ht===null)Ht=e.handle.readPointer();return Ht}function N(e,t,n,r){let o=null;return function(){if(o===null)o=new NativeFunction(St(this).add(e*vt).readPointer(),t,n,Sr);let i=[o];return i=i.concat.apply(i,arguments),r.apply(this,i)}}b.prototype.getVersion=N(4,"int32",["pointer"],function(e){return e(this.handle)});b.prototype.findClass=N(6,"pointer",["pointer","pointer"],function(e,t){let n=e(this.handle,Memory.allocUtf8String(t));return this.throwIfExceptionPending(),n});b.prototype.throwIfExceptionPending=function(){let e=this.exceptionOccurred();if(e.isNull())return;this.exceptionClear();let t=this.newGlobalRef(e);this.deleteLocalRef(e);let n=this.vaMethod("pointer",[])(this.handle,t,this.javaLangObject().toString),r=this.stringFromJni(n);this.deleteLocalRef(n);let o=Error(r);throw o.$h=t,Script.bindWeak(o,ea(this.vm,t)),o};function ea(e,t){return function(){e.perform((n)=>{n.deleteGlobalRef(t)})}}b.prototype.fromReflectedMethod=N(7,"pointer",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.fromReflectedField=N(8,"pointer",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.toReflectedMethod=N(9,"pointer",["pointer","pointer","pointer","uint8"],function(e,t,n,r){return e(this.handle,t,n,r)});b.prototype.getSuperclass=N(10,"pointer",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.isAssignableFrom=N(11,"uint8",["pointer","pointer","pointer"],function(e,t,n){return!!e(this.handle,t,n)});b.prototype.toReflectedField=N(12,"pointer",["pointer","pointer","pointer","uint8"],function(e,t,n,r){return e(this.handle,t,n,r)});b.prototype.throw=N(13,"int32",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.exceptionOccurred=N(15,"pointer",["pointer"],function(e){return e(this.handle)});b.prototype.exceptionDescribe=N(16,"void",["pointer"],function(e){e(this.handle)});b.prototype.exceptionClear=N(17,"void",["pointer"],function(e){e(this.handle)});b.prototype.pushLocalFrame=N(19,"int32",["pointer","int32"],function(e,t){return e(this.handle,t)});b.prototype.popLocalFrame=N(20,"pointer",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.newGlobalRef=N(21,"pointer",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.deleteGlobalRef=N(22,"void",["pointer","pointer"],function(e,t){e(this.handle,t)});b.prototype.deleteLocalRef=N(23,"void",["pointer","pointer"],function(e,t){e(this.handle,t)});b.prototype.isSameObject=N(24,"uint8",["pointer","pointer","pointer"],function(e,t,n){return!!e(this.handle,t,n)});b.prototype.newLocalRef=N(25,"pointer",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.allocObject=N(27,"pointer",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.getObjectClass=N(31,"pointer",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.isInstanceOf=N(32,"uint8",["pointer","pointer","pointer"],function(e,t,n){return!!e(this.handle,t,n)});b.prototype.getMethodId=N(33,"pointer",["pointer","pointer","pointer","pointer"],function(e,t,n,r){return e(this.handle,t,Memory.allocUtf8String(n),Memory.allocUtf8String(r))});b.prototype.getFieldId=N(94,"pointer",["pointer","pointer","pointer","pointer"],function(e,t,n,r){return e(this.handle,t,Memory.allocUtf8String(n),Memory.allocUtf8String(r))});b.prototype.getIntField=N(100,"int32",["pointer","pointer","pointer"],function(e,t,n){return e(this.handle,t,n)});b.prototype.getStaticMethodId=N(113,"pointer",["pointer","pointer","pointer","pointer"],function(e,t,n,r){return e(this.handle,t,Memory.allocUtf8String(n),Memory.allocUtf8String(r))});b.prototype.getStaticFieldId=N(144,"pointer",["pointer","pointer","pointer","pointer"],function(e,t,n,r){return e(this.handle,t,Memory.allocUtf8String(n),Memory.allocUtf8String(r))});b.prototype.getStaticIntField=N(150,"int32",["pointer","pointer","pointer"],function(e,t,n){return e(this.handle,t,n)});b.prototype.getStringLength=N(164,"int32",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.getStringChars=N(165,"pointer",["pointer","pointer","pointer"],function(e,t){return e(this.handle,t,NULL)});b.prototype.releaseStringChars=N(166,"void",["pointer","pointer","pointer"],function(e,t,n){e(this.handle,t,n)});b.prototype.newStringUtf=N(167,"pointer",["pointer","pointer"],function(e,t){let n=Memory.allocUtf8String(t);return e(this.handle,n)});b.prototype.getStringUtfChars=N(169,"pointer",["pointer","pointer","pointer"],function(e,t){return e(this.handle,t,NULL)});b.prototype.releaseStringUtfChars=N(170,"void",["pointer","pointer","pointer"],function(e,t,n){e(this.handle,t,n)});b.prototype.getArrayLength=N(171,"int32",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.newObjectArray=N(172,"pointer",["pointer","int32","pointer","pointer"],function(e,t,n,r){return e(this.handle,t,n,r)});b.prototype.getObjectArrayElement=N(173,"pointer",["pointer","pointer","int32"],function(e,t,n){return e(this.handle,t,n)});b.prototype.setObjectArrayElement=N(174,"void",["pointer","pointer","int32","pointer"],function(e,t,n,r){e(this.handle,t,n,r)});b.prototype.newBooleanArray=N(175,"pointer",["pointer","int32"],function(e,t){return e(this.handle,t)});b.prototype.newByteArray=N(176,"pointer",["pointer","int32"],function(e,t){return e(this.handle,t)});b.prototype.newCharArray=N(177,"pointer",["pointer","int32"],function(e,t){return e(this.handle,t)});b.prototype.newShortArray=N(178,"pointer",["pointer","int32"],function(e,t){return e(this.handle,t)});b.prototype.newIntArray=N(179,"pointer",["pointer","int32"],function(e,t){return e(this.handle,t)});b.prototype.newLongArray=N(180,"pointer",["pointer","int32"],function(e,t){return e(this.handle,t)});b.prototype.newFloatArray=N(181,"pointer",["pointer","int32"],function(e,t){return e(this.handle,t)});b.prototype.newDoubleArray=N(182,"pointer",["pointer","int32"],function(e,t){return e(this.handle,t)});b.prototype.getBooleanArrayElements=N(183,"pointer",["pointer","pointer","pointer"],function(e,t){return e(this.handle,t,NULL)});b.prototype.getByteArrayElements=N(184,"pointer",["pointer","pointer","pointer"],function(e,t){return e(this.handle,t,NULL)});b.prototype.getCharArrayElements=N(185,"pointer",["pointer","pointer","pointer"],function(e,t){return e(this.handle,t,NULL)});b.prototype.getShortArrayElements=N(186,"pointer",["pointer","pointer","pointer"],function(e,t){return e(this.handle,t,NULL)});b.prototype.getIntArrayElements=N(187,"pointer",["pointer","pointer","pointer"],function(e,t){return e(this.handle,t,NULL)});b.prototype.getLongArrayElements=N(188,"pointer",["pointer","pointer","pointer"],function(e,t){return e(this.handle,t,NULL)});b.prototype.getFloatArrayElements=N(189,"pointer",["pointer","pointer","pointer"],function(e,t){return e(this.handle,t,NULL)});b.prototype.getDoubleArrayElements=N(190,"pointer",["pointer","pointer","pointer"],function(e,t){return e(this.handle,t,NULL)});b.prototype.releaseBooleanArrayElements=N(191,"pointer",["pointer","pointer","pointer","int32"],function(e,t,n){e(this.handle,t,n,je)});b.prototype.releaseByteArrayElements=N(192,"pointer",["pointer","pointer","pointer","int32"],function(e,t,n){e(this.handle,t,n,je)});b.prototype.releaseCharArrayElements=N(193,"pointer",["pointer","pointer","pointer","int32"],function(e,t,n){e(this.handle,t,n,je)});b.prototype.releaseShortArrayElements=N(194,"pointer",["pointer","pointer","pointer","int32"],function(e,t,n){e(this.handle,t,n,je)});b.prototype.releaseIntArrayElements=N(195,"pointer",["pointer","pointer","pointer","int32"],function(e,t,n){e(this.handle,t,n,je)});b.prototype.releaseLongArrayElements=N(196,"pointer",["pointer","pointer","pointer","int32"],function(e,t,n){e(this.handle,t,n,je)});b.prototype.releaseFloatArrayElements=N(197,"pointer",["pointer","pointer","pointer","int32"],function(e,t,n){e(this.handle,t,n,je)});b.prototype.releaseDoubleArrayElements=N(198,"pointer",["pointer","pointer","pointer","int32"],function(e,t,n){e(this.handle,t,n,je)});b.prototype.getByteArrayRegion=N(200,"void",["pointer","pointer","int","int","pointer"],function(e,t,n,r,o){e(this.handle,t,n,r,o)});b.prototype.setBooleanArrayRegion=N(207,"void",["pointer","pointer","int32","int32","pointer"],function(e,t,n,r,o){e(this.handle,t,n,r,o)});b.prototype.setByteArrayRegion=N(208,"void",["pointer","pointer","int32","int32","pointer"],function(e,t,n,r,o){e(this.handle,t,n,r,o)});b.prototype.setCharArrayRegion=N(209,"void",["pointer","pointer","int32","int32","pointer"],function(e,t,n,r,o){e(this.handle,t,n,r,o)});b.prototype.setShortArrayRegion=N(210,"void",["pointer","pointer","int32","int32","pointer"],function(e,t,n,r,o){e(this.handle,t,n,r,o)});b.prototype.setIntArrayRegion=N(211,"void",["pointer","pointer","int32","int32","pointer"],function(e,t,n,r,o){e(this.handle,t,n,r,o)});b.prototype.setLongArrayRegion=N(212,"void",["pointer","pointer","int32","int32","pointer"],function(e,t,n,r,o){e(this.handle,t,n,r,o)});b.prototype.setFloatArrayRegion=N(213,"void",["pointer","pointer","int32","int32","pointer"],function(e,t,n,r,o){e(this.handle,t,n,r,o)});b.prototype.setDoubleArrayRegion=N(214,"void",["pointer","pointer","int32","int32","pointer"],function(e,t,n,r,o){e(this.handle,t,n,r,o)});b.prototype.registerNatives=N(215,"int32",["pointer","pointer","pointer","int32"],function(e,t,n,r){return e(this.handle,t,n,r)});b.prototype.monitorEnter=N(217,"int32",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.monitorExit=N(218,"int32",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.getDirectBufferAddress=N(230,"pointer",["pointer","pointer"],function(e,t){return e(this.handle,t)});b.prototype.getObjectRefType=N(232,"int32",["pointer","pointer"],function(e,t){return e(this.handle,t)});var vr=new Map;function wt(e,t,n,r){return sn(this,"p",na,e,t,n,r)}function on(e,t,n,r){return sn(this,"v",ra,e,t,n,r)}function ta(e,t,n,r){return sn(this,"n",oa,e,t,n,r)}function sn(e,t,n,r,o,i,s){if(s!==void 0)return n(e,r,o,i,s);let l=[r,t,o].concat(i).join("|"),a=vr.get(l);if(a===void 0)a=n(e,r,o,i,Sr),vr.set(l,a);return a}function na(e,t,n,r,o){return new NativeFunction(St(e).add(t*vt).readPointer(),n,["pointer","pointer","pointer"].concat(r),o)}function ra(e,t,n,r,o){return new NativeFunction(St(e).add(t*vt).readPointer(),n,["pointer","pointer","pointer","..."].concat(r),o)}function oa(e,t,n,r,o){return new NativeFunction(St(e).add(t*vt).readPointer(),n,["pointer","pointer","pointer","pointer","..."].concat(r),o)}b.prototype.constructor=function(e,t){return on.call(this,Oi,"pointer",e,t)};b.prototype.vaMethod=function(e,t,n){let r=Zs[e];if(r===void 0)throw Error("Unsupported type: "+e);return on.call(this,r,e,t,n)};b.prototype.nonvirtualVaMethod=function(e,t,n){let r=Ws[e];if(r===void 0)throw Error("Unsupported type: "+e);return ta.call(this,r,e,t,n)};b.prototype.staticVaMethod=function(e,t,n){let r=qs[e];if(r===void 0)throw Error("Unsupported type: "+e);return on.call(this,r,e,t,n)};b.prototype.getField=function(e){let t=Ks[e];if(t===void 0)throw Error("Unsupported type: "+e);return wt.call(this,t,e,[])};b.prototype.getStaticField=function(e){let t=Xs[e];if(t===void 0)throw Error("Unsupported type: "+e);return wt.call(this,t,e,[])};b.prototype.setField=function(e){let t=Qs[e];if(t===void 0)throw Error("Unsupported type: "+e);return wt.call(this,t,"void",[e])};b.prototype.setStaticField=function(e){let t=Ys[e];if(t===void 0)throw Error("Unsupported type: "+e);return wt.call(this,t,"void",[e])};var Zt=null;b.prototype.javaLangClass=function(){if(Zt===null){let e=this.findClass("java/lang/Class");try{let t=this.getMethodId.bind(this,e);Zt={handle:De(this.newGlobalRef(e)),getName:t("getName","()Ljava/lang/String;"),getSimpleName:t("getSimpleName","()Ljava/lang/String;"),getGenericSuperclass:t("getGenericSuperclass","()Ljava/lang/reflect/Type;"),getDeclaredConstructors:t("getDeclaredConstructors","()[Ljava/lang/reflect/Constructor;"),getDeclaredMethods:t("getDeclaredMethods","()[Ljava/lang/reflect/Method;"),getDeclaredFields:t("getDeclaredFields","()[Ljava/lang/reflect/Field;"),isArray:t("isArray","()Z"),isPrimitive:t("isPrimitive","()Z"),isInterface:t("isInterface","()Z"),getComponentType:t("getComponentType","()Ljava/lang/Class;")}}finally{this.deleteLocalRef(e)}}return Zt};var Wt=null;b.prototype.javaLangObject=function(){if(Wt===null){let e=this.findClass("java/lang/Object");try{let t=this.getMethodId.bind(this,e);Wt={handle:De(this.newGlobalRef(e)),toString:t("toString","()Ljava/lang/String;"),getClass:t("getClass","()Ljava/lang/Class;")}}finally{this.deleteLocalRef(e)}}return Wt};var qt=null;b.prototype.javaLangReflectConstructor=function(){if(qt===null){let e=this.findClass("java/lang/reflect/Constructor");try{qt={getGenericParameterTypes:this.getMethodId(e,"getGenericParameterTypes","()[Ljava/lang/reflect/Type;")}}finally{this.deleteLocalRef(e)}}return qt};var Kt=null;b.prototype.javaLangReflectMethod=function(){if(Kt===null){let e=this.findClass("java/lang/reflect/Method");try{let t=this.getMethodId.bind(this,e);Kt={getName:t("getName","()Ljava/lang/String;"),getGenericParameterTypes:t("getGenericParameterTypes","()[Ljava/lang/reflect/Type;"),getParameterTypes:t("getParameterTypes","()[Ljava/lang/Class;"),getGenericReturnType:t("getGenericReturnType","()Ljava/lang/reflect/Type;"),getGenericExceptionTypes:t("getGenericExceptionTypes","()[Ljava/lang/reflect/Type;"),getModifiers:t("getModifiers","()I"),isVarArgs:t("isVarArgs","()Z")}}finally{this.deleteLocalRef(e)}}return Kt};var Qt=null;b.prototype.javaLangReflectField=function(){if(Qt===null){let e=this.findClass("java/lang/reflect/Field");try{let t=this.getMethodId.bind(this,e);Qt={getName:t("getName","()Ljava/lang/String;"),getType:t("getType","()Ljava/lang/Class;"),getGenericType:t("getGenericType","()Ljava/lang/reflect/Type;"),getModifiers:t("getModifiers","()I"),toString:t("toString","()Ljava/lang/String;")}}finally{this.deleteLocalRef(e)}}return Qt};var Xt=null;b.prototype.javaLangReflectTypeVariable=function(){if(Xt===null){let e=this.findClass("java/lang/reflect/TypeVariable");try{let t=this.getMethodId.bind(this,e);Xt={handle:De(this.newGlobalRef(e)),getName:t("getName","()Ljava/lang/String;"),getBounds:t("getBounds","()[Ljava/lang/reflect/Type;"),getGenericDeclaration:t("getGenericDeclaration","()Ljava/lang/reflect/GenericDeclaration;")}}finally{this.deleteLocalRef(e)}}return Xt};var Yt=null;b.prototype.javaLangReflectWildcardType=function(){if(Yt===null){let e=this.findClass("java/lang/reflect/WildcardType");try{let t=this.getMethodId.bind(this,e);Yt={handle:De(this.newGlobalRef(e)),getLowerBounds:t("getLowerBounds","()[Ljava/lang/reflect/Type;"),getUpperBounds:t("getUpperBounds","()[Ljava/lang/reflect/Type;")}}finally{this.deleteLocalRef(e)}}return Yt};var en=null;b.prototype.javaLangReflectGenericArrayType=function(){if(en===null){let e=this.findClass("java/lang/reflect/GenericArrayType");try{en={handle:De(this.newGlobalRef(e)),getGenericComponentType:this.getMethodId(e,"getGenericComponentType","()Ljava/lang/reflect/Type;")}}finally{this.deleteLocalRef(e)}}return en};var tn=null;b.prototype.javaLangReflectParameterizedType=function(){if(tn===null){let e=this.findClass("java/lang/reflect/ParameterizedType");try{let t=this.getMethodId.bind(this,e);tn={handle:De(this.newGlobalRef(e)),getActualTypeArguments:t("getActualTypeArguments","()[Ljava/lang/reflect/Type;"),getRawType:t("getRawType","()Ljava/lang/reflect/Type;"),getOwnerType:t("getOwnerType","()Ljava/lang/reflect/Type;")}}finally{this.deleteLocalRef(e)}}return tn};var nn=null;b.prototype.javaLangString=function(){if(nn===null){let e=this.findClass("java/lang/String");try{nn={handle:De(this.newGlobalRef(e))}}finally{this.deleteLocalRef(e)}}return nn};b.prototype.getClassName=function(e){let t=this.vaMethod("pointer",[])(this.handle,e,this.javaLangClass().getName);try{return this.stringFromJni(t)}finally{this.deleteLocalRef(t)}};b.prototype.getObjectClassName=function(e){let t=this.getObjectClass(e);try{return this.getClassName(t)}finally{this.deleteLocalRef(t)}};b.prototype.getActualTypeArgument=function(e){let t=this.vaMethod("pointer",[])(this.handle,e,this.javaLangReflectParameterizedType().getActualTypeArguments);if(this.throwIfExceptionPending(),!t.isNull())try{return this.getTypeNameFromFirstTypeElement(t)}finally{this.deleteLocalRef(t)}};b.prototype.getTypeNameFromFirstTypeElement=function(e){if(this.getArrayLength(e)>0){let n=this.getObjectArrayElement(e,0);try{return this.getTypeName(n)}finally{this.deleteLocalRef(n)}}else return"java.lang.Object"};b.prototype.getTypeName=function(e,t){let n=this.vaMethod("pointer",[]);if(this.isInstanceOf(e,this.javaLangClass().handle))return this.getClassName(e);else if(this.isInstanceOf(e,this.javaLangReflectGenericArrayType().handle))return this.getArrayTypeName(e);else if(this.isInstanceOf(e,this.javaLangReflectParameterizedType().handle)){let r=n(this.handle,e,this.javaLangReflectParameterizedType().getRawType);this.throwIfExceptionPending();let o;try{o=this.getTypeName(r)}finally{this.deleteLocalRef(r)}if(t)o+="<"+this.getActualTypeArgument(e)+">";return o}else if(this.isInstanceOf(e,this.javaLangReflectTypeVariable().handle))return"java.lang.Object";else if(this.isInstanceOf(e,this.javaLangReflectWildcardType().handle))return"java.lang.Object";else return"java.lang.Object"};b.prototype.getArrayTypeName=function(e){let t=this.vaMethod("pointer",[]);if(this.isInstanceOf(e,this.javaLangClass().handle))return this.getClassName(e);else if(this.isInstanceOf(e,this.javaLangReflectGenericArrayType().handle)){let n=t(this.handle,e,this.javaLangReflectGenericArrayType().getGenericComponentType);this.throwIfExceptionPending();try{return"[L"+this.getTypeName(n)+";"}finally{this.deleteLocalRef(n)}}else return"[Ljava.lang.Object;"};b.prototype.stringFromJni=function(e){let t=this.getStringChars(e);if(t.isNull())throw Error("Unable to access string");try{let n=this.getStringLength(e);return t.readUtf16String(n)}finally{this.releaseStringChars(e,t)}};var wr=65542,Ze=Process.pointerSize,an=Process.getCurrentThreadId(),Ue=new Map,rt=new Map;function Se(e){let t=e.vm,n=null,r=null,o=null;function i(){let l=t.readPointer(),a={exceptions:"propagate"};n=new NativeFunction(l.add(4*Ze).readPointer(),"int32",["pointer","pointer","pointer"],a),r=new NativeFunction(l.add(5*Ze).readPointer(),"int32",["pointer"],a),o=new NativeFunction(l.add(6*Ze).readPointer(),"int32",["pointer","pointer","int32"],a)}this.handle=t,this.perform=function(l){let a=Process.getCurrentThreadId(),c=s(a);if(c!==null)return l(c);let d=this._tryGetEnv(),p=d!==null;if(!p)d=this.attachCurrentThread(),Ue.set(a,!0);this.link(a,d);try{return l(d)}finally{let u=a===an;if(!u)this.unlink(a);if(!p&&!u){let h=Ue.get(a);if(Ue.delete(a),h)this.detachCurrentThread()}}},this.attachCurrentThread=function(){let l=Memory.alloc(Ze);return ce("VM::AttachCurrentThread",n(t,l,NULL)),new b(l.readPointer(),this)},this.detachCurrentThread=function(){ce("VM::DetachCurrentThread",r(t))},this.preventDetachDueToClassLoader=function(){let l=Process.getCurrentThreadId();if(Ue.has(l))Ue.set(l,!1)},this.getEnv=function(){let l=s(Process.getCurrentThreadId());if(l!==null)return l;let a=Memory.alloc(Ze),c=o(t,a,wr);if(c===-2)throw Error("Current thread is not attached to the Java VM; please move this code inside a Java.perform() callback");return ce("VM::GetEnv",c),new b(a.readPointer(),this)},this.tryGetEnv=function(){let l=s(Process.getCurrentThreadId());if(l!==null)return l;return this._tryGetEnv()},this._tryGetEnv=function(){let l=this.tryGetEnvHandle(wr);if(l===null)return null;return new b(l,this)},this.tryGetEnvHandle=function(l){let a=Memory.alloc(Ze);if(o(t,a,l)!==bt)return null;return a.readPointer()},this.makeHandleDestructor=function(l){return()=>{this.perform((a)=>{a.deleteGlobalRef(l)})}},this.link=function(l,a){let c=rt.get(l);if(c===void 0)rt.set(l,[a,1]);else c[1]++},this.unlink=function(l){let a=rt.get(l);if(a[1]===1)rt.delete(l);else a[1]--};function s(l){let a=rt.get(l);if(a===void 0)return null;return a[0]}i.call(this)}Se.dispose=function(e){if(Ue.get(an)===!0)Ue.delete(an),e.detachCurrentThread()};var ia=4,w=Process.pointerSize,{readU32:sa,readPointer:aa,writeU32:la,writePointer:ca}=NativePointer.prototype,da=1,ua=8,pa=16,At=256,ha=524288,fa=2097152,zr=1073741824,_a=524288,ma=134217728,gn=1048576,ga=2097152,ba=268435456,ya=268435456,Ea=0,bn=3,yn=5,vn=ptr(1).not(),va=2147467263,Sa=4294963200,Lt=17*w,wa=18*w,Vr=12,Ia=112,Ca=116,Ta=0,ln=56,Ir=4,Aa=8,Na=10,La=12,Ma=14,ka=28,xa=36,ja=0,Oa=1,Ra=2,Pa=3,Fa=4,Da=5,Ua=6,za=7,Cr=2147483648,Va=28,at=3*w,Ba=3*w,Ja=1,Ga=1,Br=se(nl),$a=se(_l),pe=se(gl),qe=se(bl),Ha=se(yl),Za=se(Nl),lt=se(wl),Jr=se(Il),ee=se(Cl),Sn=se(Tl),Wa=se(xl),qa=Process.arch==="ia32"?yc:bc,X={exceptions:"propagate"},ot={},cn=null,dn=null,Gr=null,re=null,wn=[],Nt=new Map,Tr=new Map,$r=[],un=null,Ar=0,Nr=!1,Lr=!1,it=null,Ka=[],pn=null,It=null;function B(){if(cn===null)cn=Qa();return cn}function Qa(){let e=Process.enumerateModules().filter((h)=>/^lib(art|dvm).so$/.test(h.name)).filter((h)=>!/\/system\/fake-libs/.test(h.path));if(e.length===0)return null;let t=e[0],n=t.name.indexOf("art")!==-1?"art":"dalvik",r=n==="art",o={module:t,find(h){let{module:_}=this,f=_.findExportByName(h);if(f===null)f=_.findSymbolByName(h);return f},flavor:n,addLocalReference:null};o.isApiLevel34OrApexEquivalent=r&&(o.find("_ZN3art7AppInfo29GetPrimaryApkReferenceProfileEv")!==null||o.find("_ZN3art6Thread15RunFlipFunctionEPS0_")!==null);let i=r?{functions:{JNI_GetCreatedJavaVMs:["JNI_GetCreatedJavaVMs","int",["pointer","int","pointer"]],artInterpreterToCompiledCodeBridge:function(h){this.artInterpreterToCompiledCodeBridge=h},_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadENS_6ObjPtrINS_6mirror6ObjectEEE:["art::JavaVMExt::AddGlobalRef","pointer",["pointer","pointer","pointer"]],_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadEPNS_6mirror6ObjectE:["art::JavaVMExt::AddGlobalRef","pointer",["pointer","pointer","pointer"]],_ZN3art17ReaderWriterMutex13ExclusiveLockEPNS_6ThreadE:["art::ReaderWriterMutex::ExclusiveLock","void",["pointer","pointer"]],_ZN3art17ReaderWriterMutex15ExclusiveUnlockEPNS_6ThreadE:["art::ReaderWriterMutex::ExclusiveUnlock","void",["pointer","pointer"]],_ZN3art22IndirectReferenceTable3AddEjPNS_6mirror6ObjectE:function(h){this["art::IndirectReferenceTable::Add"]=new NativeFunction(h,"pointer",["pointer","uint","pointer"],X)},_ZN3art22IndirectReferenceTable3AddENS_15IRTSegmentStateENS_6ObjPtrINS_6mirror6ObjectEEE:function(h){this["art::IndirectReferenceTable::Add"]=new NativeFunction(h,"pointer",["pointer","uint","pointer"],X)},_ZN3art9JavaVMExt12DecodeGlobalEPv:function(h){let _;if(ee()>=26)_=qa(h,["pointer","pointer"]);else _=new NativeFunction(h,"pointer",["pointer","pointer"],X);this["art::JavaVMExt::DecodeGlobal"]=function(f,m,y){return _(f,y)}},_ZN3art9JavaVMExt12DecodeGlobalEPNS_6ThreadEPv:["art::JavaVMExt::DecodeGlobal","pointer",["pointer","pointer","pointer"]],_ZNK3art6Thread19DecodeGlobalJObjectEP8_jobject:["art::Thread::DecodeJObject","pointer",["pointer","pointer"]],_ZNK3art6Thread13DecodeJObjectEP8_jobject:["art::Thread::DecodeJObject","pointer",["pointer","pointer"]],_ZN3art10ThreadList10SuspendAllEPKcb:["art::ThreadList::SuspendAll","void",["pointer","pointer","bool"]],_ZN3art10ThreadList10SuspendAllEv:function(h){let _=new NativeFunction(h,"void",["pointer"],X);this["art::ThreadList::SuspendAll"]=function(f,m,y){return _(f)}},_ZN3art10ThreadList9ResumeAllEv:["art::ThreadList::ResumeAll","void",["pointer"]],_ZN3art11ClassLinker12VisitClassesEPNS_12ClassVisitorE:["art::ClassLinker::VisitClasses","void",["pointer","pointer"]],_ZN3art11ClassLinker12VisitClassesEPFbPNS_6mirror5ClassEPvES4_:function(h){let _=new NativeFunction(h,"void",["pointer","pointer","pointer"],X);this["art::ClassLinker::VisitClasses"]=function(f,m){_(f,m,NULL)}},_ZNK3art11ClassLinker17VisitClassLoadersEPNS_18ClassLoaderVisitorE:["art::ClassLinker::VisitClassLoaders","void",["pointer","pointer"]],_ZN3art2gc4Heap12VisitObjectsEPFvPNS_6mirror6ObjectEPvES5_:["art::gc::Heap::VisitObjects","void",["pointer","pointer","pointer"]],_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE:["art::gc::Heap::GetInstances","void",["pointer","pointer","pointer","int","pointer"]],_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEbiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE:function(h){let _=new NativeFunction(h,"void",["pointer","pointer","pointer","bool","int","pointer"],X);this["art::gc::Heap::GetInstances"]=function(f,m,y,E,k){_(f,m,y,0,E,k)}},_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEjb:["art::StackVisitor::StackVisitor","void",["pointer","pointer","pointer","uint","uint","bool"]],_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEmb:["art::StackVisitor::StackVisitor","void",["pointer","pointer","pointer","uint","size_t","bool"]],_ZN3art12StackVisitor9WalkStackILNS0_16CountTransitionsE0EEEvb:["art::StackVisitor::WalkStack","void",["pointer","bool"]],_ZNK3art12StackVisitor9GetMethodEv:["art::StackVisitor::GetMethod","pointer",["pointer"]],_ZNK3art12StackVisitor16DescribeLocationEv:function(h){this["art::StackVisitor::DescribeLocation"]=Tt(h,["pointer"])},_ZNK3art12StackVisitor24GetCurrentQuickFrameInfoEv:function(h){this["art::StackVisitor::GetCurrentQuickFrameInfo"]=kl(h)},_ZN3art7Context6CreateEv:["art::Context::Create","pointer",[]],_ZN3art6Thread18GetLongJumpContextEv:["art::Thread::GetLongJumpContext","pointer",["pointer"]],_ZN3art6mirror5Class13GetDescriptorEPNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE:function(h){this["art::mirror::Class::GetDescriptor"]=h},_ZN3art6mirror5Class11GetLocationEv:function(h){this["art::mirror::Class::GetLocation"]=Tt(h,["pointer"])},_ZN3art9ArtMethod12PrettyMethodEb:function(h){this["art::ArtMethod::PrettyMethod"]=Tt(h,["pointer","bool"])},_ZN3art12PrettyMethodEPNS_9ArtMethodEb:function(h){this["art::ArtMethod::PrettyMethodNullSafe"]=Tt(h,["pointer","bool"])},_ZN3art6Thread14CurrentFromGdbEv:["art::Thread::CurrentFromGdb","pointer",[]],_ZN3art6mirror6Object5CloneEPNS_6ThreadE:function(h){this["art::mirror::Object::Clone"]=new NativeFunction(h,"pointer",["pointer","pointer"],X)},_ZN3art6mirror6Object5CloneEPNS_6ThreadEm:function(h){let _=new NativeFunction(h,"pointer",["pointer","pointer","pointer"],X);this["art::mirror::Object::Clone"]=function(f,m){let y=NULL;return _(f,m,y)}},_ZN3art6mirror6Object5CloneEPNS_6ThreadEj:function(h){let _=new NativeFunction(h,"pointer",["pointer","pointer","uint"],X);this["art::mirror::Object::Clone"]=function(f,m){return _(f,m,0)}},_ZN3art7Runtime22CreateCalleeSaveMethodEv:["art::Runtime::CreateCalleeSaveMethod","pointer",["pointer"]],_ZN3art3Dbg14SetJdwpAllowedEb:["art::Dbg::SetJdwpAllowed","void",["bool"]],_ZN3art3Dbg13ConfigureJdwpERKNS_4JDWP11JdwpOptionsE:["art::Dbg::ConfigureJdwp","void",["pointer"]],_ZN3art31InternalDebuggerControlCallback13StartDebuggerEv:["art::InternalDebuggerControlCallback::StartDebugger","void",["pointer"]],_ZN3art3Dbg9StartJdwpEv:["art::Dbg::StartJdwp","void",[]],_ZN3art3Dbg8GoActiveEv:["art::Dbg::GoActive","void",[]],_ZN3art3Dbg21RequestDeoptimizationERKNS_21DeoptimizationRequestE:["art::Dbg::RequestDeoptimization","void",["pointer"]],_ZN3art3Dbg20ManageDeoptimizationEv:["art::Dbg::ManageDeoptimization","void",[]],_ZN3art15instrumentation15Instrumentation20EnableDeoptimizationEv:["art::Instrumentation::EnableDeoptimization","void",["pointer"]],_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEPKc:["art::Instrumentation::DeoptimizeEverything","void",["pointer","pointer"]],_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEv:function(h){let _=new NativeFunction(h,"void",["pointer"],X);this["art::Instrumentation::DeoptimizeEverything"]=function(f,m){_(f)}},_ZN3art7Runtime19DeoptimizeBootImageEv:["art::Runtime::DeoptimizeBootImage","void",["pointer"]],_ZN3art15instrumentation15Instrumentation10DeoptimizeEPNS_9ArtMethodE:["art::Instrumentation::Deoptimize","void",["pointer","pointer"]],_ZN3art15instrumentation15Instrumentation13IsDeoptimizedEPNS_9ArtMethodE:["art::Instrumentation::IsDeoptimized","bool",["pointer","pointer"]],_ZN3art3jni12JniIdManager14DecodeMethodIdEP10_jmethodID:["art::jni::JniIdManager::DecodeMethodId","pointer",["pointer","pointer"]],_ZN3art3jni12JniIdManager13DecodeFieldIdEP9_jfieldID:["art::jni::JniIdManager::DecodeFieldId","pointer",["pointer","pointer"]],_ZN3art11interpreter18GetNterpEntryPointEv:["art::interpreter::GetNterpEntryPoint","pointer",[]],_ZN3art7Monitor17TranslateLocationEPNS_9ArtMethodEjPPKcPi:["art::Monitor::TranslateLocation","void",["pointer","uint32","pointer","pointer"]]},variables:{_ZN3art3Dbg9gRegistryE:function(h){this.isJdwpStarted=()=>!h.readPointer().isNull()},_ZN3art3Dbg15gDebuggerActiveE:function(h){this.isDebuggerActive=()=>!!h.readU8()},_ZN3art15gUseUserfaultfdE:function(h){this.isUserfaultfdGcActive=!!h.readU8()}},optionals:new Set(["artInterpreterToCompiledCodeBridge","_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadENS_6ObjPtrINS_6mirror6ObjectEEE","_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadEPNS_6mirror6ObjectE","_ZN3art9JavaVMExt12DecodeGlobalEPv","_ZN3art9JavaVMExt12DecodeGlobalEPNS_6ThreadEPv","_ZNK3art6Thread19DecodeGlobalJObjectEP8_jobject","_ZNK3art6Thread13DecodeJObjectEP8_jobject","_ZN3art10ThreadList10SuspendAllEPKcb","_ZN3art10ThreadList10SuspendAllEv","_ZN3art11ClassLinker12VisitClassesEPNS_12ClassVisitorE","_ZN3art11ClassLinker12VisitClassesEPFbPNS_6mirror5ClassEPvES4_","_ZNK3art11ClassLinker17VisitClassLoadersEPNS_18ClassLoaderVisitorE","_ZN3art6mirror6Object5CloneEPNS_6ThreadE","_ZN3art6mirror6Object5CloneEPNS_6ThreadEm","_ZN3art6mirror6Object5CloneEPNS_6ThreadEj","_ZN3art7Runtime22CreateCalleeSaveMethodEv","_ZN3art22IndirectReferenceTable3AddEjPNS_6mirror6ObjectE","_ZN3art22IndirectReferenceTable3AddENS_15IRTSegmentStateENS_6ObjPtrINS_6mirror6ObjectEEE","_ZN3art2gc4Heap12VisitObjectsEPFvPNS_6mirror6ObjectEPvES5_","_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE","_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEbiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE","_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEjb","_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEmb","_ZN3art12StackVisitor9WalkStackILNS0_16CountTransitionsE0EEEvb","_ZNK3art12StackVisitor9GetMethodEv","_ZNK3art12StackVisitor16DescribeLocationEv","_ZNK3art12StackVisitor24GetCurrentQuickFrameInfoEv","_ZN3art7Context6CreateEv","_ZN3art6Thread18GetLongJumpContextEv","_ZN3art6mirror5Class13GetDescriptorEPNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE","_ZN3art6mirror5Class11GetLocationEv","_ZN3art9ArtMethod12PrettyMethodEb","_ZN3art12PrettyMethodEPNS_9ArtMethodEb","_ZN3art3Dbg13ConfigureJdwpERKNS_4JDWP11JdwpOptionsE","_ZN3art31InternalDebuggerControlCallback13StartDebuggerEv","_ZN3art3Dbg15gDebuggerActiveE","_ZN3art15gUseUserfaultfdE","_ZN3art15instrumentation15Instrumentation20EnableDeoptimizationEv","_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEPKc","_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEv","_ZN3art7Runtime19DeoptimizeBootImageEv","_ZN3art15instrumentation15Instrumentation10DeoptimizeEPNS_9ArtMethodE","_ZN3art15instrumentation15Instrumentation13IsDeoptimizedEPNS_9ArtMethodE","_ZN3art3Dbg9StartJdwpEv","_ZN3art3Dbg8GoActiveEv","_ZN3art3Dbg21RequestDeoptimizationERKNS_21DeoptimizationRequestE","_ZN3art3Dbg20ManageDeoptimizationEv","_ZN3art3Dbg9gRegistryE","_ZN3art3jni12JniIdManager14DecodeMethodIdEP10_jmethodID","_ZN3art3jni12JniIdManager13DecodeFieldIdEP9_jfieldID","_ZN3art11interpreter18GetNterpEntryPointEv","_ZN3art7Monitor17TranslateLocationEPNS_9ArtMethodEjPPKcPi"])}:{functions:{_Z20dvmDecodeIndirectRefP6ThreadP8_jobject:["dvmDecodeIndirectRef","pointer",["pointer","pointer"]],_Z15dvmUseJNIBridgeP6MethodPv:["dvmUseJNIBridge","void",["pointer","pointer"]],_Z20dvmHeapSourceGetBasev:["dvmHeapSourceGetBase","pointer",[]],_Z21dvmHeapSourceGetLimitv:["dvmHeapSourceGetLimit","pointer",[]],_Z16dvmIsValidObjectPK6Object:["dvmIsValidObject","uint8",["pointer"]],JNI_GetCreatedJavaVMs:["JNI_GetCreatedJavaVMs","int",["pointer","int","pointer"]]},variables:{gDvmJni:function(h){this.gDvmJni=h},gDvm:function(h){this.gDvm=h}}},{functions:s={},variables:l={},optionals:a=new Set}=i,c=[];for(let[h,_]of Object.entries(s)){let f=o.find(h);if(f!==null)if(typeof _==="function")_.call(o,f);else o[_[0]]=new NativeFunction(f,_[1],_[2],X);else if(!a.has(h))c.push(h)}for(let[h,_]of Object.entries(l)){let f=o.find(h);if(f!==null)_.call(o,f);else if(!a.has(h))c.push(h)}if(c.length>0)throw Error("Java API only partially available; please file a bug. Missing: "+c.join(", "));let d=Memory.alloc(w),p=Memory.alloc(ia);if(ce("JNI_GetCreatedJavaVMs",o.JNI_GetCreatedJavaVMs(d,1,p)),p.readInt()===0)return null;if(o.vm=d.readPointer(),r){let h=ee(),_;if(h>=27)_=33554432;else if(h>=24)_=16777216;else _=0;o.kAccCompileDontBother=_;let f=o.vm.add(w).readPointer();o.artRuntime=f;let m=Br(o),y=m.offset,E=y.instrumentation;if(o.artInstrumentation=E!==null?f.add(E):null,Sn()>=360000000&&o.artInstrumentation!=null)o.artInstrumentation=o.artInstrumentation.readPointer();o.artHeap=f.add(y.heap).readPointer(),o.artThreadList=f.add(y.threadList).readPointer();let T=f.add(y.classLinker).readPointer(),O=ml(f,m).offset,M=T.add(O.quickResolutionTrampoline).readPointer(),j=T.add(O.quickImtConflictTrampoline).readPointer(),v=T.add(O.quickGenericJniTrampoline).readPointer(),L=T.add(O.quickToInterpreterBridgeTrampoline).readPointer();o.artClassLinker={address:T,quickResolutionTrampoline:M,quickImtConflictTrampoline:j,quickGenericJniTrampoline:v,quickToInterpreterBridgeTrampoline:L};let S=new Se(o);if(o.artQuickGenericJniTrampoline=hn(v,S),o.artQuickToInterpreterBridge=hn(L,S),o.artQuickResolutionTrampoline=hn(M,S),o["art::JavaVMExt::AddGlobalRef"]===void 0)o["art::JavaVMExt::AddGlobalRef"]=pc(o);if(o["art::JavaVMExt::DecodeGlobal"]===void 0)o["art::JavaVMExt::DecodeGlobal"]=hc(o);if(o["art::ArtMethod::PrettyMethod"]===void 0)o["art::ArtMethod::PrettyMethod"]=o["art::ArtMethod::PrettyMethodNullSafe"];if(o["art::interpreter::GetNterpEntryPoint"]!==void 0)o.artNterpEntryPoint=o["art::interpreter::GetNterpEntryPoint"]();else o.artNterpEntryPoint=o.find("ExecuteNterpImpl");re=Rl(o,S),gc(o);let x=null;Object.defineProperty(o,"jvmti",{get(){if(x===null)x=[Xa(S,this.artRuntime)];return x[0]}})}let u=t.enumerateImports().filter((h)=>h.name.indexOf("_Z")===0).reduce((h,_)=>(h[_.name]=_.address,h),{});return o.$new=new NativeFunction(u._Znwm||u._Znwj,"pointer",["ulong"],X),o.$delete=new NativeFunction(u._ZdlPv,"void",["pointer"],X),Gr=r?Xr:Yr,o}function Xa(e,t){let n=null;return e.perform(()=>{let r=B().find("_ZN3art7Runtime18EnsurePluginLoadedEPKcPNSt3__112basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEE");if(r===null)return;let o=new NativeFunction(r,"bool",["pointer","pointer","pointer"]),i=Memory.alloc(w);if(!Ya(()=>o(t,Memory.allocUtf8String("libopenjdkjvmti.so"),i)))return;let l=yt.v1_2|1073741824,a=e.tryGetEnvHandle(l);if(a===null)return;n=new Ae(a,e);let c=Memory.alloc(8);if(c.writeU64(Et.canTagObjects),n.addCapabilities(c)!==bt)n=null}),n}function Ya(e){let t=null,n=new NativeCallback(()=>{},"void",["pointer"]),r=Interceptor.attach(Process.getModuleByName("libdl.so").getExportByName("dlsym"),{onEnter(o){this.isPluginInitializer=o[1].readCString()==="ArtPlugin_Initialize"},onLeave(){if(!this.isPluginInitializer)return;if(t=Process.getModuleByName("libopenjdkjvmti.so").findExportByName("_ZN12openjdkjvmti12DeoptManager11FinishSetupEv"),t!==null)Interceptor.replace(t,n)}});try{return e()}finally{if(r.detach(),t!==null)Interceptor.revert(t);Interceptor.flush()}}function el(e,t){if(B().flavor!=="art")return;e.getFieldId(t,"x","Z"),e.exceptionClear()}function tl(e){return{offset:w===4?{globalsLock:32,globals:72}:{globalsLock:64,globals:112}}}function nl(e){let{vm:t,artRuntime:n}=e,r=w===4?200:384,o=r+100*w,i=ee(),s=Jr(),{isApiLevel34OrApexEquivalent:l}=e,a=null;for(let d=r;d!==o;d+=w)if(n.add(d).readPointer().equals(t)){let u,h=null;if(i>=33||s==="Tiramisu"||l)u=[d-4*w],h=d-w;else if(i>=30||s==="R")u=[d-3*w,d-4*w],h=d-w;else if(i>=29)u=[d-2*w];else if(i>=27)u=[d-at-3*w];else u=[d-at-2*w];for(let _ of u){let f=_-w,m=f-w,y;if(l)y=m-9*w;else if(i>=24)y=m-8*w;else if(i>=23)y=m-7*w;else y=m-4*w;let E={offset:{heap:y,threadList:m,internTable:f,classLinker:_,jniIdManager:h}};if(Hr(n,E)!==null){a=E;break}}break}if(a===null)throw Error("Unable to determine Runtime field offsets");let c=Sn()>=360000000;return a.offset.instrumentation=c?ll(e):ol(e),a.offset.jniIdsIndirection=pl(e),a}var rl={ia32:Mr,x64:Mr,arm:il,arm64:sl};function ol(e){let t=e["art::Runtime::DeoptimizeBootImage"];if(t===void 0)return null;return Ne(t,rl[Process.arch],{limit:30})}function Mr(e){if(e.mnemonic!=="lea")return null;let t=e.operands[1].value.disp;if(t<256||t>1024)return null;return t}function il(e){if(e.mnemonic!=="add.w")return null;let t=e.operands;if(t.length!==3)return null;let n=t[2];if(n.type!=="imm")return null;return n.value}function sl(e){if(e.mnemonic!=="add")return null;let t=e.operands;if(t.length!==3)return null;if(t[0].value==="sp"||t[1].value==="sp")return null;let n=t[2];if(n.type!=="imm")return null;let r=n.value.valueOf();if(r<256||r>1024)return null;return r}var al={ia32:kr,x64:kr,arm:cl,arm64:dl};function ll(e){let t=e["art::Runtime::DeoptimizeBootImage"];if(t===void 0)return null;return Ne(t,al[Process.arch],{limit:30})}function kr(e){if(e.mnemonic!=="mov")return null;let t=e.operands;if(t[0].value!=="rax")return null;let r=t[1];if(r.type!=="mem")return null;let o=r.value;if(o.base!=="rdi")return null;let i=o.disp;if(i<256||i>1024)return null;return i}function cl(e){return null}function dl(e){if(e.mnemonic!=="ldr")return null;let t=e.operands;if(t[0].value==="x0")return null;let n=t[1].value;if(n.base!=="x0")return null;let r=n.disp;if(r<256||r>1024)return null;return r}var ul={ia32:xr,x64:xr,arm:hl,arm64:fl};function pl(e){let t=e.find("_ZN3art7Runtime12SetJniIdTypeENS_9JniIdTypeE");if(t===null)return null;let n=Ne(t,ul[Process.arch],{limit:20});if(n===null)throw Error("Unable to determine Runtime.jni_ids_indirection_ offset");return n}function xr(e){if(e.mnemonic==="cmp")return e.operands[0].value.disp;return null}function hl(e){if(e.mnemonic==="ldr.w")return e.operands[1].value.disp;return null}function fl(e,t){if(t===null)return null;let{mnemonic:n}=e,{mnemonic:r}=t;if(n==="cmp"&&r==="ldr"||n==="bl"&&r==="str")return t.operands[1].value.disp;return null}function _l(){let t={"4-21":136,"4-22":136,"4-23":172,"4-24":196,"4-25":196,"4-26":196,"4-27":196,"4-28":212,"4-29":172,"4-30":180,"4-31":180,"8-21":224,"8-22":224,"8-23":296,"8-24":344,"8-25":344,"8-26":352,"8-27":352,"8-28":392,"8-29":328,"8-30":336,"8-31":336}[`${w}-${ee()}`];if(t===void 0)throw Error("Unable to determine Instrumentation field offsets");return{offset:{forcedInterpretOnly:4,deoptimizationEnabled:t}}}function ml(e,t){let n=Hr(e,t);if(n===null)throw Error("Unable to determine ClassLinker field offsets");return n}function Hr(e,t){if(dn!==null)return dn;let{classLinker:n,internTable:r}=t.offset,o=e.add(n).readPointer(),i=e.add(r).readPointer(),s=w===4?100:200,l=s+100*w,a=ee(),c=null;for(let d=s;d!==l;d+=w)if(o.add(d).readPointer().equals(i)){let u;if(a>=30||Jr()==="R")u=6;else if(a>=29)u=4;else if(a>=23)u=3;else u=5;let h=d+u*w,_;if(a>=23)_=h-2*w;else _=h-3*w;c={offset:{quickResolutionTrampoline:_,quickImtConflictTrampoline:h-w,quickGenericJniTrampoline:h,quickToInterpreterBridgeTrampoline:h+w}};break}if(c!==null)dn=c;return c}function In(e){let n=null;return e.perform((r)=>{let o=Mt(e),i=pe(e),s={artArrayLengthSize:4,artArrayEntrySize:o.size,artArrayMax:50},l={artArrayLengthSize:w,artArrayEntrySize:i.size,artArrayMax:100},a=(u,h,_)=>{let f=u.add(h).readPointer();if(f.isNull())return null;let m=_===4?f.readU32():f.readU64().valueOf();if(m<=0)return null;return{length:m,data:f.add(_)}},c=(u,h,_,f)=>{try{let m=a(u,h,f.artArrayLengthSize);if(m===null)return!1;let y=Math.min(m.length,f.artArrayMax);for(let E=0;E!==y;E++)if(m.data.add(E*f.artArrayEntrySize).equals(_))return!0}catch{}return!1},d=r.findClass("java/lang/Thread"),p=r.newGlobalRef(d);try{let u;he(e,r,(v)=>{u=B()["art::JavaVMExt::DecodeGlobal"](e,v,p)});let h=Rr(r.getFieldId(p,"name","Ljava/lang/String;")),_=Rr(r.getStaticFieldId(p,"MAX_PRIORITY","I")),f=-1,m=-1;for(let v=0;v!==256;v+=4){if(f===-1&&c(u,v,_,s))f=v;if(m===-1&&c(u,v,h,s))m=v}if(m===-1||f===-1)throw Error("Unable to find fields in java/lang/Thread; please file a bug");let y=m!==f?f:0,E=m,k=-1,T=jn(r.getMethodId(p,"getName","()Ljava/lang/String;"));for(let v=0;v!==256;v+=4)if(k===-1&&c(u,v,T,l))k=v;if(k===-1)throw Error("Unable to find methods in java/lang/Thread; please file a bug");let O=-1,j=a(u,k,l.artArrayLengthSize).length;for(let v=k;v!==256;v+=4)if(u.add(v).readU16()===j){O=v;break}if(O===-1)throw Error("Unable to find copied methods in java/lang/Thread; please file a bug");n={offset:{ifields:E,methods:k,sfields:y,copiedMethodsOffset:O}}}finally{r.deleteLocalRef(d),r.deleteGlobalRef(p)}}),n}function gl(e){let t=B(),n;return e.perform((r)=>{let o=r.findClass("android/os/Process"),i=jn(r.getStaticMethodId(o,"getElapsedCpuTime","()J"));r.deleteLocalRef(o);let s=Process.getModuleByName("libandroid_runtime.so"),l=s.base,a=l.add(s.size),c=ee(),d=c<=21?8:w,p=da|ua|pa|At,u=~(zr|ba|ga|gn)>>>0,h=null,_=null,f=2;for(let E=0;E!==64&&f!==0;E+=4){let k=i.add(E);if(h===null){let T=k.readPointer();if(T.compare(l)>=0&&T.compare(a)<0)h=E,f--}if(_===null){if((k.readU32()&u)===p)_=E,f--}}if(f!==0)throw Error("Unable to determine ArtMethod field offsets");let m=h+d;if(n={size:c<=21?m+32:m+w,offset:{jniCode:h,quickCode:m,accessFlags:_}},"artInterpreterToCompiledCodeBridge"in t)n.offset.interpreterCode=h-d}),n}function Mt(e){let t=ee();if(t>=23)return{size:16,offset:{accessFlags:4}};if(t>=21)return{size:24,offset:{accessFlags:12}};return null}function bl(e){let t=ee(),n;return e.perform((r)=>{let o=kt(r),i=r.handle,s=null,l=null,a=null,c=null,d=null,p=null;for(let u=144;u!==256;u+=w)if(o.add(u).readPointer().equals(i)){if(l=u-6*w,d=u-4*w,p=u+2*w,t<=22)l-=w,s=l-w-72-12,a=u+6*w,d-=w,p-=w;if(c=u+9*w,t<=22){if(c+=2*w+4,w===8)c+=4}if(t>=23)c+=w;break}if(c===null)throw Error("Unable to determine ArtThread field offsets");n={offset:{isExceptionReportedToInstrumentation:s,exception:l,throwLocation:a,topHandleScope:c,managedStack:d,self:p}}}),n}function yl(){if(ee()>=23)return{offset:{topQuickFrame:0,link:w}};else return{offset:{topQuickFrame:2*w,link:0}}}var El={ia32:jr,x64:jr,arm:vl,arm64:Sl};function hn(e,t){let n;return t.perform((r)=>{let o=kt(r),i=El[Process.arch],s=Instruction.parse(e),l=i(s);if(l!==null)n=o.add(l).readPointer();else n=e}),n}function jr(e){if(e.mnemonic==="jmp")return e.operands[0].value.disp;return null}function vl(e){if(e.mnemonic==="ldr.w")return e.operands[1].value.disp;return null}function Sl(e){if(e.mnemonic==="ldr")return e.operands[1].value.disp;return null}function kt(e){return e.handle.add(w).readPointer()}function wl(){return Cn("ro.build.version.release")}function Il(){return Cn("ro.build.version.codename")}function Cl(){return parseInt(Cn("ro.build.version.sdk"),10)}function Tl(){try{let e=File.readAllText("/proc/self/mountinfo"),t=null,n=new Map;for(let o of e.trimEnd().split(`
`)){let i=o.split(" "),s=i[4];if(!s.startsWith("/apex/com.android.art"))continue;let l=i[10];if(s.includes("@"))n.set(l,s.split("@")[1]);else t=l}let r=n.get(t);return r!==void 0?parseInt(r):Or()}catch{return Or()}}function Or(){return ee()*1e7}var fn=null,Al=92;function Cn(e){if(fn===null)fn=new NativeFunction(Process.getModuleByName("libc.so").getExportByName("__system_property_get"),"int",["pointer","pointer"],X);let t=Memory.alloc(Al);return fn(Memory.allocUtf8String(e),t),t.readUtf8String()}function he(e,t,n){let r=Za(e,t),o=kt(t).toString();if(ot[o]=n,r(t.handle),ot[o]!==void 0)throw delete ot[o],Error("Unable to perform state transition; please file a bug")}function Nl(e,t){let n=new NativeCallback(Ll,"void",["pointer"]);return no(e,t,n)}function Ll(e){let t=e.toString(),n=ot[t];delete ot[t],n(e)}function Tn(e){let t=B(),n=t.artThreadList,r=!1;t["art::ThreadList::SuspendAll"](n,Memory.allocUtf8String("frida"),0);try{e()}finally{t["art::ThreadList::ResumeAll"](n)}}class Zr{constructor(e){let t=Memory.alloc(4*w),n=t.add(w);t.writePointer(n);let r=new NativeCallback((o,i)=>e(i)===!0?1:0,"bool",["pointer","pointer"]);n.add(2*w).writePointer(r),this.handle=t,this._onVisit=r}}function An(e){if(B()["art::ClassLinker::VisitClasses"]instanceof NativeFunction)return new Zr(e);return new NativeCallback((n)=>e(n)===!0?1:0,"bool",["pointer","pointer"])}class Wr{constructor(e){let t=Memory.alloc(4*w),n=t.add(w);t.writePointer(n);let r=new NativeCallback((o,i)=>{e(i)},"void",["pointer","pointer"]);n.add(2*w).writePointer(r),this.handle=t,this._onVisit=r}}function Nn(e){return new Wr(e)}var Ml={"include-inlined-frames":0,"skip-inlined-frames":1};class qr{constructor(e,t,n,r=0,o=!0){let i=B(),s=512,l=3*w,a=Memory.alloc(512+l);i["art::StackVisitor::StackVisitor"](a,e,t,Ml[n],r,o?1:0);let c=a.add(512);a.writePointer(c);let d=new NativeCallback(this._visitFrame.bind(this),"bool",["pointer"]);c.add(2*w).writePointer(d),this.handle=a,this._onVisitFrame=d;let p=a.add(w===4?12:24);this._curShadowFrame=p,this._curQuickFrame=p.add(w),this._curQuickFramePc=p.add(2*w),this._curOatQuickMethodHeader=p.add(3*w),this._getMethodImpl=i["art::StackVisitor::GetMethod"],this._descLocImpl=i["art::StackVisitor::DescribeLocation"],this._getCQFIImpl=i["art::StackVisitor::GetCurrentQuickFrameInfo"]}walkStack(e=!1){B()["art::StackVisitor::WalkStack"](this.handle,e?1:0)}_visitFrame(){return this.visitFrame()?1:0}visitFrame(){throw Error("Subclass must implement visitFrame")}getMethod(){let e=this._getMethodImpl(this.handle);if(e.isNull())return null;return new Ln(e)}getCurrentQuickFramePc(){return this._curQuickFramePc.readPointer()}getCurrentQuickFrame(){return this._curQuickFrame.readPointer()}getCurrentShadowFrame(){return this._curShadowFrame.readPointer()}describeLocation(){let e=new zn;return this._descLocImpl(e,this.handle),e.disposeToString()}getCurrentOatQuickMethodHeader(){return this._curOatQuickMethodHeader.readPointer()}getCurrentQuickFrameInfo(){return this._getCQFIImpl(this.handle)}}class Ln{constructor(e){this.handle=e}prettyMethod(e=!0){let t=new zn;return B()["art::ArtMethod::PrettyMethod"](t,this.handle,e?1:0),t.disposeToString()}toString(){return`ArtMethod(handle=${this.handle})`}}function kl(e){return function(t){let n=Memory.alloc(12);return Wa(e)(n,t),{frameSizeInBytes:n.readU32(),coreSpillMask:n.add(4).readU32(),fpSpillMask:n.add(8).readU32()}}}function xl(e){let t=NULL;switch(Process.arch){case"ia32":t=We(32,(n)=>{n.putMovRegRegOffsetPtr("ecx","esp",4),n.putMovRegRegOffsetPtr("edx","esp",8),n.putCallAddressWithArguments(e,["ecx","edx"]),n.putMovRegReg("esp","ebp"),n.putPopReg("ebp"),n.putRet()});break;case"x64":t=We(32,(n)=>{n.putPushReg("rdi"),n.putCallAddressWithArguments(e,["rsi"]),n.putPopReg("rdi"),n.putMovRegPtrReg("rdi","rax"),n.putMovRegOffsetPtrReg("rdi",8,"edx"),n.putRet()});break;case"arm":t=We(16,(n)=>{n.putCallAddressWithArguments(e,["r0","r1"]),n.putPopRegs(["r0","lr"]),n.putMovRegReg("pc","lr")});break;case"arm64":t=We(64,(n)=>{n.putPushRegReg("x0","lr"),n.putCallAddressWithArguments(e,["x1"]),n.putPopRegReg("x2","lr"),n.putStrRegRegOffset("x0","x2",0),n.putStrRegRegOffset("w1","x2",8),n.putRet()});break}return new NativeFunction(t,"void",["pointer","pointer"],X)}var jl={ia32:globalThis.X86Relocator,x64:globalThis.X86Relocator,arm:globalThis.ThumbRelocator,arm64:globalThis.Arm64Relocator},En={ia32:globalThis.X86Writer,x64:globalThis.X86Writer,arm:globalThis.ThumbWriter,arm64:globalThis.Arm64Writer};function We(e,t){if(un===null)un=Memory.alloc(Process.pageSize);let n=un.add(Ar),r=Process.arch,o=En[r];return Memory.patchCode(n,e,(i)=>{let s=new o(i,{pc:n});if(t(s),s.flush(),s.offset>e)throw Error(`Wrote ${s.offset}, exceeding maximum of ${e}`)}),Ar+=e,r==="arm"?n.or(1):n}function Ol(e,t){Pl(t),Vl(t)}function Rl(e,t){let n=qe(t).offset,r=Ha().offset,o=`
#include <gum/guminterceptor.h>

extern GMutex lock;
extern GHashTable * methods;
extern GHashTable * replacements;
extern gpointer last_seen_art_method;

extern gpointer get_oat_quick_method_header_impl (gpointer method, gpointer pc);

void
init (void)
{
  g_mutex_init (&lock);
  methods = g_hash_table_new_full (NULL, NULL, NULL, NULL);
  replacements = g_hash_table_new_full (NULL, NULL, NULL, NULL);
}

void
finalize (void)
{
  g_hash_table_unref (replacements);
  g_hash_table_unref (methods);
  g_mutex_clear (&lock);
}

gboolean
is_replacement_method (gpointer method)
{
  gboolean is_replacement;

  g_mutex_lock (&lock);

  is_replacement = g_hash_table_contains (replacements, method);

  g_mutex_unlock (&lock);

  return is_replacement;
}

gpointer
get_replacement_method (gpointer original_method)
{
  gpointer replacement_method;

  g_mutex_lock (&lock);

  replacement_method = g_hash_table_lookup (methods, original_method);

  g_mutex_unlock (&lock);

  return replacement_method;
}

void
set_replacement_method (gpointer original_method,
                        gpointer replacement_method)
{
  g_mutex_lock (&lock);

  g_hash_table_insert (methods, original_method, replacement_method);
  g_hash_table_insert (replacements, replacement_method, original_method);

  g_mutex_unlock (&lock);
}

void
synchronize_replacement_methods (guint quick_code_offset,
                                 void * nterp_entrypoint,
                                 void * quick_to_interpreter_bridge)
{
  GHashTableIter iter;
  gpointer hooked_method, replacement_method;

  g_mutex_lock (&lock);

  g_hash_table_iter_init (&iter, methods);
  while (g_hash_table_iter_next (&iter, &hooked_method, &replacement_method))
  {
    void ** quick_code;

    *((uint32_t *) replacement_method) = *((uint32_t *) hooked_method);

    quick_code = hooked_method + quick_code_offset;
    if (*quick_code == nterp_entrypoint)
      *quick_code = quick_to_interpreter_bridge;
  }

  g_mutex_unlock (&lock);
}

void
delete_replacement_method (gpointer original_method)
{
  gpointer replacement_method;

  g_mutex_lock (&lock);

  replacement_method = g_hash_table_lookup (methods, original_method);
  if (replacement_method != NULL)
  {
    g_hash_table_remove (methods, original_method);
    g_hash_table_remove (replacements, replacement_method);
  }

  g_mutex_unlock (&lock);
}

gpointer
translate_method (gpointer method)
{
  gpointer translated_method;

  g_mutex_lock (&lock);

  translated_method = g_hash_table_lookup (replacements, method);

  g_mutex_unlock (&lock);

  return (translated_method != NULL) ? translated_method : method;
}

gpointer
find_replacement_method_from_quick_code (gpointer method,
                                         gpointer thread)
{
  gpointer replacement_method;
  gpointer managed_stack;
  gpointer top_quick_frame;
  gpointer link_managed_stack;
  gpointer * link_top_quick_frame;

  replacement_method = get_replacement_method (method);
  if (replacement_method == NULL)
    return NULL;

  /*
   * Stack check.
   *
   * Return NULL to indicate that the original method should be invoked, otherwise
   * return a pointer to the replacement ArtMethod.
   *
   * If the caller is our own JNI replacement stub, then a stack transition must
   * have been pushed onto the current thread's linked list.
   *
   * Therefore, we invoke the original method if the following conditions are met:
   *   1- The current managed stack is empty.
   *   2- The ArtMethod * inside the linked managed stack's top quick frame is the
   *      same as our replacement.
   */
  managed_stack = thread + ${n.managedStack};
  top_quick_frame = *((gpointer *) (managed_stack + ${r.topQuickFrame}));
  if (top_quick_frame != NULL)
    return replacement_method;

  link_managed_stack = *((gpointer *) (managed_stack + ${r.link}));
  if (link_managed_stack == NULL)
    return replacement_method;

  link_top_quick_frame = GSIZE_TO_POINTER (*((gsize *) (link_managed_stack + ${r.topQuickFrame})) & ~((gsize) 1));
  if (link_top_quick_frame == NULL || *link_top_quick_frame != replacement_method)
    return replacement_method;

  return NULL;
}

void
on_interpreter_do_call (GumInvocationContext * ic)
{
  gpointer method, replacement_method;

  method = gum_invocation_context_get_nth_argument (ic, 0);

  replacement_method = get_replacement_method (method);
  if (replacement_method != NULL)
    gum_invocation_context_replace_nth_argument (ic, 0, replacement_method);
}

gpointer
on_art_method_get_oat_quick_method_header (gpointer method,
                                           gpointer pc)
{
  if (is_replacement_method (method))
    return NULL;

  return get_oat_quick_method_header_impl (method, pc);
}

void
on_art_method_pretty_method (GumInvocationContext * ic)
{
  const guint this_arg_index = ${Process.arch==="arm64"?0:1};
  gpointer method;

  method = gum_invocation_context_get_nth_argument (ic, this_arg_index);
  if (method == NULL)
    gum_invocation_context_replace_nth_argument (ic, this_arg_index, last_seen_art_method);
  else
    last_seen_art_method = method;
}

void
on_leave_gc_concurrent_copying_copying_phase (GumInvocationContext * ic)
{
  GHashTableIter iter;
  gpointer hooked_method, replacement_method;

  g_mutex_lock (&lock);

  g_hash_table_iter_init (&iter, methods);
  while (g_hash_table_iter_next (&iter, &hooked_method, &replacement_method))
    *((uint32_t *) replacement_method) = *((uint32_t *) hooked_method);

  g_mutex_unlock (&lock);
}
`,i=8,s=w,l=w,a=w,d=Memory.alloc(8+s+l+a),p=d.add(8),u=p.add(s),h=u.add(l),_=e.find(w===4?"_ZN3art9ArtMethod23GetOatQuickMethodHeaderEj":"_ZN3art9ArtMethod23GetOatQuickMethodHeaderEm"),f=new CModule(o,{lock:d,methods:p,replacements:u,last_seen_art_method:h,get_oat_quick_method_header_impl:_??ptr("0xdeadbeef")}),m={exceptions:"propagate",scheduling:"exclusive"};return{handle:f,replacedMethods:{isReplacement:new NativeFunction(f.is_replacement_method,"bool",["pointer"],m),get:new NativeFunction(f.get_replacement_method,"pointer",["pointer"],m),set:new NativeFunction(f.set_replacement_method,"void",["pointer","pointer"],m),synchronize:new NativeFunction(f.synchronize_replacement_methods,"void",["uint","pointer","pointer"],m),delete:new NativeFunction(f.delete_replacement_method,"void",["pointer"],m),translate:new NativeFunction(f.translate_method,"pointer",["pointer"],m),findReplacementFromQuickCode:f.find_replacement_method_from_quick_code},getOatQuickMethodHeaderImpl:_,hooks:{Interpreter:{doCall:f.on_interpreter_do_call},ArtMethod:{getOatQuickMethodHeader:f.on_art_method_get_oat_quick_method_header,prettyMethod:f.on_art_method_pretty_method},Gc:{copyingPhase:{onLeave:f.on_leave_gc_concurrent_copying_copying_phase},runFlip:{onEnter:f.on_leave_gc_concurrent_copying_copying_phase}}}}}function Pl(e){if(Lr)return;Lr=!0,Fl(e),Dl(),Ul(),zl()}function Fl(e){let t=B();[t.artQuickGenericJniTrampoline,t.artQuickToInterpreterBridge,t.artQuickResolutionTrampoline].forEach((r)=>{Memory.protect(r,32,"rwx");let o=new On(r);o.activate(e),$r.push(o)})}function Dl(){let e=B(),t=ee(),{isApiLevel34OrApexEquivalent:n}=e,r;if(t<=22)r=/^_ZN3art11interpreter6DoCallILb[0-1]ELb[0-1]EEEbPNS_6mirror9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtPNS_6JValueE$/;else if(t<=33&&!n)r=/^_ZN3art11interpreter6DoCallILb[0-1]ELb[0-1]EEEbPNS_9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtPNS_6JValueE$/;else if(n)r=/^_ZN3art11interpreter6DoCallILb[0-1]EEEbPNS_9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtbPNS_6JValueE$/;else throw Error("Unable to find method invocation in ART; please file a bug");let o=e.module,i=[...o.enumerateExports(),...o.enumerateSymbols()].filter((s)=>r.test(s.name));if(i.length===0)throw Error("Unable to find method invocation in ART; please file a bug");for(let s of i)Interceptor.attach(s.address,re.hooks.Interpreter.doCall)}function Ul(){let e=B(),n=e.module.findSymbolByName("_ZN3art2gc4Heap22CollectGarbageInternalENS0_9collector6GcTypeENS0_7GcCauseEbj");if(n===null)return;let{artNterpEntryPoint:r,artQuickToInterpreterBridge:o}=e,i=pe(e.vm).offset.quickCode;Interceptor.attach(n,{onLeave(){re.replacedMethods.synchronize(i,r,o)}})}function zl(){let e=[["_ZN3art11ClassLinker26VisiblyInitializedCallback22MarkVisiblyInitializedEPNS_6ThreadE","e90340f8 : ff0ff0ff"],["_ZN3art11ClassLinker26VisiblyInitializedCallback29AdjustThreadVisibilityCounterEPNS_6ThreadEl","7f0f00f9 : 1ffcffff"]],t=B(),n=t.module;for(let[r,o]of e){let i=n.findSymbolByName(r);if(i===null)continue;let s=Memory.scanSync(i,8192,o);if(s.length===0)return;let{artNterpEntryPoint:l,artQuickToInterpreterBridge:a}=t,c=pe(t.vm).offset.quickCode;Interceptor.attach(s[0].address,function(){re.replacedMethods.synchronize(c,l,a)});return}}function Vl(e){if(Nr)return;if(Nr=!0,!Jl()){let{getOatQuickMethodHeaderImpl:i}=re;if(i===null)return;try{Interceptor.replace(i,re.hooks.ArtMethod.getOatQuickMethodHeader)}catch(s){}}let t=ee(),n=null,r=B();if(t>28)n=r.find("_ZN3art2gc9collector17ConcurrentCopying12CopyingPhaseEv");else if(t>22)n=r.find("_ZN3art2gc9collector17ConcurrentCopying12MarkingPhaseEv");if(n!==null)Interceptor.attach(n,re.hooks.Gc.copyingPhase);let o=null;if(o=r.find("_ZN3art6Thread15RunFlipFunctionEPS0_"),o===null)o=r.find("_ZN3art6Thread15RunFlipFunctionEPS0_b");if(o!==null)Interceptor.attach(o,re.hooks.Gc.runFlip)}var Bl={arm:{signatures:[{pattern:["b0 68","01 30","0c d0","1b 98",":","c0 ff","c0 ff","00 ff","00 2f"],validateMatch:_n},{pattern:["d8 f8 08 00","01 30","0c d0","1b 98",":","f0 ff ff 0f","ff ff","00 ff","00 2f"],validateMatch:_n},{pattern:["b0 68","01 30","40 f0 c3 80","00 25",":","c0 ff","c0 ff","c0 fb 00 d0","ff f8"],validateMatch:_n}],instrument:$l},arm64:{signatures:[{pattern:["0a 40 b9","1f 05 00 31","40 01 00 54","88 39 00 f0",":","fc ff ff","1f fc ff ff","1f 00 00 ff","00 00 00 9f"],offset:1,validateMatch:mn},{pattern:["0a 40 b9","1f 05 00 31","40 01 00 54","00 0e 40 f9",":","fc ff ff","1f fc ff ff","1f 00 00 ff","00 fc ff ff"],offset:1,validateMatch:mn},{pattern:["0a 40 b9","1f 05 00 31","01 34 00 54","e0 03 1f aa",":","fc ff ff","1f fc ff ff","1f 00 00 ff","e0 ff ff ff"],offset:1,validateMatch:mn}],instrument:Hl}};function _n({address:e,size:t}){let n=Instruction.parse(e.or(1)),[r,o]=n.operands,i=o.value.base,s=r.value,l=Instruction.parse(n.next.add(2)),a=ptr(l.operands[0].value),c=l.address.add(l.size),d,p;if(l.mnemonic==="beq")d=c,p=a;else d=a,p=c;return Ne(d.or(1),u,{limit:3});function u(h){let{mnemonic:_}=h;if(!(_==="ldr"||_==="ldr.w"))return null;let{base:f,disp:m}=h.operands[1].value;if(!(f===i&&m===20))return null;return{methodReg:i,scratchReg:s,target:{whenTrue:a,whenRegularMethod:d,whenRuntimeMethod:p}}}}function mn({address:e,size:t}){let[n,r]=Instruction.parse(e).operands,o=r.value.base,i="x"+n.value.substring(1),s=Instruction.parse(e.add(8)),l=ptr(s.operands[0].value),a=e.add(12),c,d;if(s.mnemonic==="b.eq")c=a,d=l;else c=l,d=a;return Ne(c,p,{limit:3});function p(u){if(u.mnemonic!=="ldr")return null;let{base:h,disp:_}=u.operands[1].value;if(!(h===o&&_===24))return null;return{methodReg:o,scratchReg:i,target:{whenTrue:l,whenRegularMethod:c,whenRuntimeMethod:d}}}}function Jl(){if(ee()<31)return!1;let e=Bl[Process.arch];if(e===void 0)return!1;let t=e.signatures.map(({pattern:r,offset:o=0,validateMatch:i=Gl})=>({pattern:new MatchPattern(r.join("")),offset:o,validateMatch:i})),n=[];for(let{base:r,size:o}of B().module.enumerateRanges("--x"))for(let{pattern:i,offset:s,validateMatch:l}of t){let a=Memory.scanSync(r,o,i).map(({address:c,size:d})=>({address:c.sub(s),size:d+s})).filter((c)=>{let d=l(c);if(d===null)return!1;return c.validationResult=d,!0});n.push(...a)}if(n.length===0)return!1;return n.forEach(e.instrument),!0}function Gl(){return{}}class Mn{constructor(e,t,n){this.address=e,this.size=t,this.originalCode=e.readByteArray(t),this.trampoline=n}revert(){Memory.patchCode(this.address,this.size,(e)=>{e.writeByteArray(this.originalCode)})}}function $l({address:e,size:t,validationResult:n}){let{methodReg:r,target:o}=n,i=Memory.alloc(Process.pageSize),s=t;Memory.patchCode(i,256,(l)=>{let a=new ThumbWriter(l,{pc:i}),c=new ThumbRelocator(e,a);for(let _=0;_!==2;_++)c.readOne();c.writeAll(),c.readOne(),c.skipOne(),a.putBCondLabel("eq","runtime_or_replacement_method");let d=[45,237,16,10];a.putBytes(d);let p=["r0","r1","r2","r3"];a.putPushRegs(p),a.putCallAddressWithArguments(re.replacedMethods.isReplacement,[r]),a.putCmpRegImm("r0",0),a.putPopRegs(p);let u=[189,236,16,10];a.putBytes(u),a.putBCondLabel("ne","runtime_or_replacement_method"),a.putBLabel("regular_method"),c.readOne();let h=c.input.address.equals(o.whenRegularMethod);a.putLabel(h?"regular_method":"runtime_or_replacement_method"),c.writeOne();while(s<10){let _=c.readOne();if(_===0){s=10;break}s=_}c.writeAll(),a.putBranchAddress(e.add(s+1)),a.putLabel(h?"runtime_or_replacement_method":"regular_method"),a.putBranchAddress(o.whenTrue),a.flush()}),wn.push(new Mn(e,s,i)),Memory.patchCode(e,s,(l)=>{let a=new ThumbWriter(l,{pc:e});a.putLdrRegAddress("pc",i.or(1)),a.flush()})}function Hl({address:e,size:t,validationResult:n}){let{methodReg:r,scratchReg:o,target:i}=n,s=Memory.alloc(Process.pageSize);Memory.patchCode(s,256,(l)=>{let a=new Arm64Writer(l,{pc:s}),c=new Arm64Relocator(e,a);for(let _=0;_!==2;_++)c.readOne();c.writeAll(),c.readOne(),c.skipOne(),a.putBCondLabel("eq","runtime_or_replacement_method");let d=["d0","d1","d2","d3","d4","d5","d6","d7","x0","x1","x2","x3","x4","x5","x6","x7","x8","x9","x10","x11","x12","x13","x14","x15","x16","x17"],p=d.length;for(let _=0;_!==p;_+=2)a.putPushRegReg(d[_],d[_+1]);a.putCallAddressWithArguments(re.replacedMethods.isReplacement,[r]),a.putCmpRegReg("x0","xzr");for(let _=p-2;_>=0;_-=2)a.putPopRegReg(d[_],d[_+1]);a.putBCondLabel("ne","runtime_or_replacement_method"),a.putBLabel("regular_method"),c.readOne();let u=c.input,h=u.address.equals(i.whenRegularMethod);a.putLabel(h?"regular_method":"runtime_or_replacement_method"),c.writeOne(),a.putBranchAddress(u.next),a.putLabel(h?"runtime_or_replacement_method":"regular_method"),a.putBranchAddress(i.whenTrue),a.flush()}),wn.push(new Mn(e,t,s)),Memory.patchCode(e,t,(l)=>{let a=new Arm64Writer(l,{pc:e});a.putLdrRegAddress(o,s),a.putBrReg(o),a.flush()})}function Zl(e){return new Gr(e)}function Wl(e){return re.replacedMethods.translate(e)}function kn(e,t={}){let{limit:n=16}=t,r=e.getEnv();if(it===null)it=ql(e,r);return it.backtrace(r,n)}function ql(e,t){let n=B(),r=Memory.alloc(Process.pointerSize),o=new CModule(`
#include <glib.h>
#include <stdbool.h>
#include <string.h>
#include <gum/gumtls.h>
#include <json-glib/json-glib.h>

typedef struct _ArtBacktrace ArtBacktrace;
typedef struct _ArtStackFrame ArtStackFrame;

typedef struct _ArtStackVisitor ArtStackVisitor;
typedef struct _ArtStackVisitorVTable ArtStackVisitorVTable;

typedef struct _ArtClass ArtClass;
typedef struct _ArtMethod ArtMethod;
typedef struct _ArtThread ArtThread;
typedef struct _ArtContext ArtContext;

typedef struct _JNIEnv JNIEnv;

typedef struct _StdString StdString;
typedef struct _StdTinyString StdTinyString;
typedef struct _StdLargeString StdLargeString;

typedef enum {
  STACK_WALK_INCLUDE_INLINED_FRAMES,
  STACK_WALK_SKIP_INLINED_FRAMES,
} StackWalkKind;

struct _StdTinyString
{
  guint8 unused;
  gchar data[(3 * sizeof (gpointer)) - 1];
};

struct _StdLargeString
{
  gsize capacity;
  gsize size;
  gchar * data;
};

struct _StdString
{
  union
  {
    guint8 flags;
    StdTinyString tiny;
    StdLargeString large;
  };
};

struct _ArtBacktrace
{
  GChecksum * id;
  GArray * frames;
  gchar * frames_json;
};

struct _ArtStackFrame
{
  ArtMethod * method;
  gsize dexpc;
  StdString description;
};

struct _ArtStackVisitorVTable
{
  void (* unused1) (void);
  void (* unused2) (void);
  bool (* visit) (ArtStackVisitor * visitor);
};

struct _ArtStackVisitor
{
  ArtStackVisitorVTable * vtable;

  guint8 padding[512];

  ArtStackVisitorVTable vtable_storage;

  ArtBacktrace * backtrace;
};

struct _ArtMethod
{
  guint32 declaring_class;
  guint32 access_flags;
};

extern GumTlsKey current_backtrace;

extern void (* perform_art_thread_state_transition) (JNIEnv * env);

extern ArtContext * art_make_context (ArtThread * thread);

extern void art_stack_visitor_init (ArtStackVisitor * visitor, ArtThread * thread, void * context, StackWalkKind walk_kind,
    size_t num_frames, bool check_suspended);
extern void art_stack_visitor_walk_stack (ArtStackVisitor * visitor, bool include_transitions);
extern ArtMethod * art_stack_visitor_get_method (ArtStackVisitor * visitor);
extern void art_stack_visitor_describe_location (StdString * description, ArtStackVisitor * visitor);
extern ArtMethod * translate_method (ArtMethod * method);
extern void translate_location (ArtMethod * method, guint32 pc, const gchar ** source_file, gint32 * line_number);
extern void get_class_location (StdString * result, ArtClass * klass);
extern void cxx_delete (void * mem);
extern unsigned long strtoul (const char * str, char ** endptr, int base);

static bool visit_frame (ArtStackVisitor * visitor);
static void art_stack_frame_destroy (ArtStackFrame * frame);

static void append_jni_type_name (GString * s, const gchar * name, gsize length);

static void std_string_destroy (StdString * str);
static gchar * std_string_get_data (StdString * str);

void
init (void)
{
  current_backtrace = gum_tls_key_new ();
}

void
finalize (void)
{
  gum_tls_key_free (current_backtrace);
}

ArtBacktrace *
_create (JNIEnv * env,
         guint limit)
{
  ArtBacktrace * bt;

  bt = g_new (ArtBacktrace, 1);
  bt->id = g_checksum_new (G_CHECKSUM_SHA1);
  bt->frames = (limit != 0)
      ? g_array_sized_new (FALSE, FALSE, sizeof (ArtStackFrame), limit)
      : g_array_new (FALSE, FALSE, sizeof (ArtStackFrame));
  g_array_set_clear_func (bt->frames, (GDestroyNotify) art_stack_frame_destroy);
  bt->frames_json = NULL;

  gum_tls_key_set_value (current_backtrace, bt);

  perform_art_thread_state_transition (env);

  gum_tls_key_set_value (current_backtrace, NULL);

  return bt;
}

void
_on_thread_state_transition_complete (ArtThread * thread)
{
  ArtContext * context;
  ArtStackVisitor visitor = {
    .vtable_storage = {
      .visit = visit_frame,
    },
  };

  context = art_make_context (thread);

  art_stack_visitor_init (&visitor, thread, context, STACK_WALK_SKIP_INLINED_FRAMES, 0, true);
  visitor.vtable = &visitor.vtable_storage;
  visitor.backtrace = gum_tls_key_get_value (current_backtrace);

  art_stack_visitor_walk_stack (&visitor, false);

  cxx_delete (context);
}

static bool
visit_frame (ArtStackVisitor * visitor)
{
  ArtBacktrace * bt = visitor->backtrace;
  ArtStackFrame frame;
  const gchar * description, * dexpc_part;

  frame.method = art_stack_visitor_get_method (visitor);

  art_stack_visitor_describe_location (&frame.description, visitor);

  description = std_string_get_data (&frame.description);
  if (strstr (description, " '<") != NULL)
    goto skip;

  dexpc_part = strstr (description, " at dex PC 0x");
  if (dexpc_part == NULL)
    goto skip;
  frame.dexpc = strtoul (dexpc_part + 13, NULL, 16);

  g_array_append_val (bt->frames, frame);

  g_checksum_update (bt->id, (guchar *) &frame.method, sizeof (frame.method));
  g_checksum_update (bt->id, (guchar *) &frame.dexpc, sizeof (frame.dexpc));

  return true;

skip:
  std_string_destroy (&frame.description);
  return true;
}

static void
art_stack_frame_destroy (ArtStackFrame * frame)
{
  std_string_destroy (&frame->description);
}

void
_destroy (ArtBacktrace * backtrace)
{
  g_free (backtrace->frames_json);
  g_array_free (backtrace->frames, TRUE);
  g_checksum_free (backtrace->id);
  g_free (backtrace);
}

const gchar *
_get_id (ArtBacktrace * backtrace)
{
  return g_checksum_get_string (backtrace->id);
}

const gchar *
_get_frames (ArtBacktrace * backtrace)
{
  GArray * frames = backtrace->frames;
  JsonBuilder * b;
  guint i;
  JsonNode * root;

  if (backtrace->frames_json != NULL)
    return backtrace->frames_json;

  b = json_builder_new_immutable ();

  json_builder_begin_array (b);

  for (i = 0; i != frames->len; i++)
  {
    ArtStackFrame * frame = &g_array_index (frames, ArtStackFrame, i);
    gchar * description, * ret_type, * paren_open, * paren_close, * arg_types, * token, * method_name, * class_name;
    GString * signature;
    gchar * cursor;
    ArtMethod * translated_method;
    StdString location;
    gsize dexpc;
    const gchar * source_file;
    gint32 line_number;

    description = std_string_get_data (&frame->description);

    ret_type = strchr (description, '\\'') + 1;

    paren_open = strchr (ret_type, '(');
    paren_close = strchr (paren_open, ')');
    *paren_open = '\\0';
    *paren_close = '\\0';

    arg_types = paren_open + 1;

    token = strrchr (ret_type, '.');
    *token = '\\0';

    method_name = token + 1;

    token = strrchr (ret_type, ' ');
    *token = '\\0';

    class_name = token + 1;

    signature = g_string_sized_new (128);

    append_jni_type_name (signature, class_name, method_name - class_name - 1);
    g_string_append_c (signature, ',');
    g_string_append (signature, method_name);
    g_string_append (signature, ",(");

    if (arg_types != paren_close)
    {
      for (cursor = arg_types; cursor != NULL;)
      {
        gsize length;
        gchar * next;

        token = strstr (cursor, ", ");
        if (token != NULL)
        {
          length = token - cursor;
          next = token + 2;
        }
        else
        {
          length = paren_close - cursor;
          next = NULL;
        }

        append_jni_type_name (signature, cursor, length);

        cursor = next;
      }
    }

    g_string_append_c (signature, ')');

    append_jni_type_name (signature, ret_type, class_name - ret_type - 1);

    translated_method = translate_method (frame->method);
    dexpc = (translated_method == frame->method) ? frame->dexpc : 0;

    get_class_location (&location, GSIZE_TO_POINTER (translated_method->declaring_class));

    translate_location (translated_method, dexpc, &source_file, &line_number);

    json_builder_begin_object (b);

    json_builder_set_member_name (b, "signature");
    json_builder_add_string_value (b, signature->str);

    json_builder_set_member_name (b, "origin");
    json_builder_add_string_value (b, std_string_get_data (&location));

    json_builder_set_member_name (b, "className");
    json_builder_add_string_value (b, class_name);

    json_builder_set_member_name (b, "methodName");
    json_builder_add_string_value (b, method_name);

    json_builder_set_member_name (b, "methodFlags");
    json_builder_add_int_value (b, translated_method->access_flags);

    json_builder_set_member_name (b, "fileName");
    json_builder_add_string_value (b, source_file);

    json_builder_set_member_name (b, "lineNumber");
    json_builder_add_int_value (b, line_number);

    json_builder_end_object (b);

    std_string_destroy (&location);
    g_string_free (signature, TRUE);
  }

  json_builder_end_array (b);

  root = json_builder_get_root (b);
  backtrace->frames_json = json_to_string (root, FALSE);
  json_node_unref (root);

  return backtrace->frames_json;
}

static void
append_jni_type_name (GString * s,
                      const gchar * name,
                      gsize length)
{
  gchar shorty = '\\0';
  gsize i;

  switch (name[0])
  {
    case 'b':
      if (strncmp (name, "boolean", length) == 0)
        shorty = 'Z';
      else if (strncmp (name, "byte", length) == 0)
        shorty = 'B';
      break;
    case 'c':
      if (strncmp (name, "char", length) == 0)
        shorty = 'C';
      break;
    case 'd':
      if (strncmp (name, "double", length) == 0)
        shorty = 'D';
      break;
    case 'f':
      if (strncmp (name, "float", length) == 0)
        shorty = 'F';
      break;
    case 'i':
      if (strncmp (name, "int", length) == 0)
        shorty = 'I';
      break;
    case 'l':
      if (strncmp (name, "long", length) == 0)
        shorty = 'J';
      break;
    case 's':
      if (strncmp (name, "short", length) == 0)
        shorty = 'S';
      break;
    case 'v':
      if (strncmp (name, "void", length) == 0)
        shorty = 'V';
      break;
  }

  if (shorty != '\\0')
  {
    g_string_append_c (s, shorty);

    return;
  }

  if (length > 2 && name[length - 2] == '[' && name[length - 1] == ']')
  {
    g_string_append_c (s, '[');
    append_jni_type_name (s, name, length - 2);

    return;
  }

  g_string_append_c (s, 'L');

  for (i = 0; i != length; i++)
  {
    gchar ch = name[i];
    if (ch != '.')
      g_string_append_c (s, ch);
    else
      g_string_append_c (s, '/');
  }

  g_string_append_c (s, ';');
}

static void
std_string_destroy (StdString * str)
{
  bool is_large = (str->flags & 1) != 0;
  if (is_large)
    cxx_delete (str->large.data);
}

static gchar *
std_string_get_data (StdString * str)
{
  bool is_large = (str->flags & 1) != 0;
  return is_large ? str->large.data : str->tiny.data;
}
`,{current_backtrace:Memory.alloc(Process.pointerSize),perform_art_thread_state_transition:r,art_make_context:n["art::Thread::GetLongJumpContext"]??n["art::Context::Create"],art_stack_visitor_init:n["art::StackVisitor::StackVisitor"],art_stack_visitor_walk_stack:n["art::StackVisitor::WalkStack"],art_stack_visitor_get_method:n["art::StackVisitor::GetMethod"],art_stack_visitor_describe_location:n["art::StackVisitor::DescribeLocation"],translate_method:re.replacedMethods.translate,translate_location:n["art::Monitor::TranslateLocation"],get_class_location:n["art::mirror::Class::GetLocation"],cxx_delete:n.$delete,strtoul:Process.getModuleByName("libc.so").getExportByName("strtoul")}),i=new NativeFunction(o._create,"pointer",["pointer","uint"],X),s=new NativeFunction(o._destroy,"void",["pointer"],X),l={exceptions:"propagate",scheduling:"exclusive"},a=new NativeFunction(o._get_id,"pointer",["pointer"],l),c=new NativeFunction(o._get_frames,"pointer",["pointer"],l),d=no(e,t,o._on_thread_state_transition_complete);o._performData=d,r.writePointer(d),o.backtrace=(u,h)=>{let _=i(u,h),f=new Kr(_);return Script.bindWeak(f,p.bind(null,_)),f};function p(u){s(u)}return o.getId=(u)=>a(u).readUtf8String(),o.getFrames=(u)=>JSON.parse(c(u).readUtf8String()),o}class Kr{constructor(e){this.handle=e}get id(){return it.getId(this.handle)}get frames(){return it.getFrames(this.handle)}}function xn(){Nt.forEach((e)=>{e.vtablePtr.writePointer(e.vtable),e.vtableCountPtr.writeS32(e.vtableCount)}),Nt.clear();for(let e of $r.splice(0))e.deactivate();for(let e of wn.splice(0))e.revert()}function jn(e){return Qr(e,"art::jni::JniIdManager::DecodeMethodId")}function Rr(e){return Qr(e,"art::jni::JniIdManager::DecodeFieldId")}function Qr(e,t){let n=B(),r=Br(n).offset,{jniIdManager:o,jniIdsIndirection:i}=r;if(o!==null&&i!==null){let s=n.artRuntime;if(s.add(i).readInt()!==Ea){let a=s.add(o).readPointer();return n[t](a,e)}}return e}var Kl={ia32:Ql,x64:Xl,arm:Yl,arm64:ec};function Ql(e,t,n,r,o){let i=qe(o).offset,s=pe(o).offset,l;return Memory.patchCode(e,128,(a)=>{let c=new X86Writer(a,{pc:e}),d=new X86Relocator(t,c),p=[15,174,4,36],u=[15,174,12,36];c.putPushax(),c.putMovRegReg("ebp","esp"),c.putAndRegU32("esp",4294967280),c.putSubRegImm("esp",512),c.putBytes(p),c.putMovRegFsU32Ptr("ebx",i.self),c.putCallAddressWithAlignedArguments(re.replacedMethods.findReplacementFromQuickCode,["eax","ebx"]),c.putTestRegReg("eax","eax"),c.putJccShortLabel("je","restore_registers","no-hint"),c.putMovRegOffsetPtrReg("ebp",28,"eax"),c.putLabel("restore_registers"),c.putBytes(u),c.putMovRegReg("esp","ebp"),c.putPopax(),c.putJccShortLabel("jne","invoke_replacement","no-hint");do l=d.readOne();while(l<n&&!d.eoi);if(d.writeAll(),!d.eoi)c.putJmpAddress(t.add(l));c.putLabel("invoke_replacement"),c.putJmpRegOffsetPtr("eax",s.quickCode),c.flush()}),l}function Xl(e,t,n,r,o){let i=qe(o).offset,s=pe(o).offset,l;return Memory.patchCode(e,256,(a)=>{let c=new X86Writer(a,{pc:e}),d=new X86Relocator(t,c),p=[15,174,4,36],u=[15,174,12,36];c.putPushax(),c.putMovRegReg("rbp","rsp"),c.putAndRegU32("rsp",4294967280),c.putSubRegImm("rsp",512),c.putBytes(p),c.putMovRegGsU32Ptr("rbx",i.self),c.putCallAddressWithAlignedArguments(re.replacedMethods.findReplacementFromQuickCode,["rdi","rbx"]),c.putTestRegReg("rax","rax"),c.putJccShortLabel("je","restore_registers","no-hint"),c.putMovRegOffsetPtrReg("rbp",64,"rax"),c.putLabel("restore_registers"),c.putBytes(u),c.putMovRegReg("rsp","rbp"),c.putPopax(),c.putJccShortLabel("jne","invoke_replacement","no-hint");do l=d.readOne();while(l<n&&!d.eoi);if(d.writeAll(),!d.eoi)c.putJmpAddress(t.add(l));c.putLabel("invoke_replacement"),c.putJmpRegOffsetPtr("rdi",s.quickCode),c.flush()}),l}function Yl(e,t,n,r,o){let i=pe(o).offset,s=t.and(vn),l;return Memory.patchCode(e,128,(a)=>{let c=new ThumbWriter(a,{pc:e}),d=new ThumbRelocator(s,c),p=[45,237,16,10],u=[189,236,16,10];c.putPushRegs(["r1","r2","r3","r5","r6","r7","r8","r10","r11","lr"]),c.putBytes(p),c.putSubRegRegImm("sp","sp",8),c.putStrRegRegOffset("r0","sp",0),c.putCallAddressWithArguments(re.replacedMethods.findReplacementFromQuickCode,["r0","r9"]),c.putCmpRegImm("r0",0),c.putBCondLabel("eq","restore_registers"),c.putStrRegRegOffset("r0","sp",0),c.putLabel("restore_registers"),c.putLdrRegRegOffset("r0","sp",0),c.putAddRegRegImm("sp","sp",8),c.putBytes(u),c.putPopRegs(["lr","r11","r10","r8","r7","r6","r5","r3","r2","r1"]),c.putBCondLabel("ne","invoke_replacement");do l=d.readOne();while(l<n&&!d.eoi);if(d.writeAll(),!d.eoi)c.putLdrRegAddress("pc",t.add(l));c.putLabel("invoke_replacement"),c.putLdrRegRegOffset("pc","r0",i.quickCode),c.flush()}),l}function ec(e,t,n,{availableScratchRegs:r},o){let i=pe(o).offset,s;return Memory.patchCode(e,256,(l)=>{let a=new Arm64Writer(l,{pc:e}),c=new Arm64Relocator(t,a);a.putPushRegReg("d0","d1"),a.putPushRegReg("d2","d3"),a.putPushRegReg("d4","d5"),a.putPushRegReg("d6","d7"),a.putPushRegReg("x1","x2"),a.putPushRegReg("x3","x4"),a.putPushRegReg("x5","x6"),a.putPushRegReg("x7","x20"),a.putPushRegReg("x21","x22"),a.putPushRegReg("x23","x24"),a.putPushRegReg("x25","x26"),a.putPushRegReg("x27","x28"),a.putPushRegReg("x29","lr"),a.putSubRegRegImm("sp","sp",16),a.putStrRegRegOffset("x0","sp",0),a.putCallAddressWithArguments(re.replacedMethods.findReplacementFromQuickCode,["x0","x19"]),a.putCmpRegReg("x0","xzr"),a.putBCondLabel("eq","restore_registers"),a.putStrRegRegOffset("x0","sp",0),a.putLabel("restore_registers"),a.putLdrRegRegOffset("x0","sp",0),a.putAddRegRegImm("sp","sp",16),a.putPopRegReg("x29","lr"),a.putPopRegReg("x27","x28"),a.putPopRegReg("x25","x26"),a.putPopRegReg("x23","x24"),a.putPopRegReg("x21","x22"),a.putPopRegReg("x7","x20"),a.putPopRegReg("x5","x6"),a.putPopRegReg("x3","x4"),a.putPopRegReg("x1","x2"),a.putPopRegReg("d6","d7"),a.putPopRegReg("d4","d5"),a.putPopRegReg("d2","d3"),a.putPopRegReg("d0","d1"),a.putBCondLabel("ne","invoke_replacement");do s=c.readOne();while(s<n&&!c.eoi);if(c.writeAll(),!c.eoi){let d=Array.from(r)[0];a.putLdrRegAddress(d,t.add(s)),a.putBrReg(d)}a.putLabel("invoke_replacement"),a.putLdrRegRegOffset("x16","x0",i.quickCode),a.putBrReg("x16"),a.flush()}),s}var tc={ia32:Pr,x64:Pr,arm:nc,arm64:rc};function Pr(e,t,n){Memory.patchCode(e,16,(r)=>{let o=new X86Writer(r,{pc:e});o.putJmpAddress(t),o.flush()})}function nc(e,t,n){let r=e.and(vn);Memory.patchCode(r,16,(o)=>{let i=new ThumbWriter(o,{pc:r});i.putLdrRegAddress("pc",t.or(1)),i.flush()})}function rc(e,t,n){Memory.patchCode(e,16,(r)=>{let o=new Arm64Writer(r,{pc:e});if(n===16)o.putLdrRegAddress("x16",t);else o.putAdrpRegAddress("x16",t);o.putBrReg("x16"),o.flush()})}var oc={ia32:5,x64:16,arm:8,arm64:16};class On{constructor(e){this.quickCode=e,this.quickCodeAddress=Process.arch==="arm"?e.and(vn):e,this.redirectSize=0,this.trampoline=null,this.overwrittenPrologue=null,this.overwrittenPrologueLength=0}_canRelocateCode(e,t){let n=En[Process.arch],r=jl[Process.arch],{quickCodeAddress:o}=this,i=new n(o),s=new r(o,i),l;if(Process.arch==="arm64"){let a=new Set(["x16","x17"]);do{let c=s.readOne(),d=new Set(a),{read:p,written:u}=s.input.regsAccessed;for(let h of[p,u])for(let _ of h){let f;if(_.startsWith("w"))f="x"+_.substring(1);else f=_;d.delete(f)}if(d.size===0)break;l=c,a=d}while(l<e&&!s.eoi);t.availableScratchRegs=a}else do l=s.readOne();while(l<e&&!s.eoi);return l>=e}_allocateTrampoline(){if(It===null)It=$t(w===4?128:256);let e=oc[Process.arch],t,n,r=1,o={};if(w===4||this._canRelocateCode(e,o))t=e,n={};else{let i;if(Process.arch==="x64")t=5,i=va;else if(Process.arch==="arm64")t=8,i=Sa,r=4096;n={near:this.quickCodeAddress,maxDistance:i}}return this.redirectSize=t,this.trampoline=It.allocateSlice(n,r),o}_destroyTrampoline(){It.freeSlice(this.trampoline)}activate(e){let t=this._allocateTrampoline(),{trampoline:n,quickCode:r,redirectSize:o}=this,i=Kl[Process.arch],s=i(n,r,o,t,e);this.overwrittenPrologueLength=s,this.overwrittenPrologue=Memory.dup(this.quickCodeAddress,s);let l=tc[Process.arch];l(r,n,o)}deactivate(){let{quickCodeAddress:e,overwrittenPrologueLength:t}=this,n=En[Process.arch];Memory.patchCode(e,t,(r)=>{let o=new n(r,{pc:e}),{overwrittenPrologue:i}=this;o.putBytes(i.readByteArray(t)),o.flush()}),this._destroyTrampoline()}}function ic(e){let t=B(),{module:n,artClassLinker:r}=t;return e.equals(r.quickGenericJniTrampoline)||e.equals(r.quickToInterpreterBridgeTrampoline)||e.equals(r.quickResolutionTrampoline)||e.equals(r.quickImtConflictTrampoline)||e.compare(n.base)>=0&&e.compare(n.base.add(n.size))<0}class Xr{constructor(e){let t=jn(e);this.methodId=t,this.originalMethod=null,this.hookedMethodId=t,this.replacementMethodId=null,this.interceptor=null}replace(e,t,n,r,o){let{kAccCompileDontBother:i,artNterpEntryPoint:s}=o;this.originalMethod=Fr(this.methodId,r);let l=this.originalMethod.accessFlags;if((l&ya)!==0&&sc()){let u=this.originalMethod.jniCode;this.hookedMethodId=u.add(2*w).readPointer(),this.originalMethod=Fr(this.hookedMethodId,r)}let{hookedMethodId:a}=this,c=lc(a,r);this.replacementMethodId=c,Ct(c,{jniCode:e,accessFlags:(l&~(fa|ha|gn)|At|i)>>>0,quickCode:o.artClassLinker.quickGenericJniTrampoline,interpreterCode:o.artInterpreterToCompiledCodeBridge},r);let d=zr|ma|gn;if((l&At)===0)d|=_a;Ct(a,{accessFlags:(l&~d|i)>>>0},r);let p=this.originalMethod.quickCode;if(s!==null&&p.equals(s))Ct(a,{quickCode:o.artQuickToInterpreterBridge},r);if(!ic(p)){let u=new On(p);u.activate(r),this.interceptor=u}re.replacedMethods.set(a,c),Ol(a,r)}revert(e){let{hookedMethodId:t,interceptor:n}=this;if(Ct(t,this.originalMethod,e),re.replacedMethods.delete(t),n!==null)n.deactivate(),this.interceptor=null}resolveTarget(e,t,n,r){return this.hookedMethodId}}function sc(){return ee()<28}function Fr(e,t){let r=pe(t).offset;return["jniCode","accessFlags","quickCode","interpreterCode"].reduce((o,i)=>{let s=r[i];if(s===void 0)return o;let l=e.add(s),a=i==="accessFlags"?sa:aa;return o[i]=a.call(l),o},{})}function Ct(e,t,n){let o=pe(n).offset;Object.keys(t).forEach((i)=>{let s=o[i];if(s===void 0)return;let l=e.add(s);(i==="accessFlags"?la:ca).call(l,t[i])})}class Yr{constructor(e){this.methodId=e,this.originalMethod=null}replace(e,t,n,r,o){let{methodId:i}=this;this.originalMethod=Memory.dup(i,ln);let s=n.reduce((p,u)=>p+u.size,0);if(t)s++;let l=(i.add(Ir).readU32()|At)>>>0,a=s,c=0,d=s;i.add(Ir).writeU32(l),i.add(Na).writeU16(a),i.add(La).writeU16(c),i.add(Ma).writeU16(d),i.add(xa).writeU32(ac(i)),o.dvmUseJNIBridge(i,e)}revert(e){Memory.copy(this.methodId,this.originalMethod,ln)}resolveTarget(e,t,n,r){let o=n.handle.add(Vr).readPointer(),i;if(t)i=r.dvmDecodeIndirectRef(o,e.$h);else{let p=e.$borrowClassHandle(n);i=r.dvmDecodeIndirectRef(o,p.value),p.unref(n)}let s;if(t)s=i.add(Ta).readPointer();else s=i;let l=s.toString(16),a=Nt.get(l);if(a===void 0){let p=s.add(Ca),u=s.add(Ia),h=p.readPointer(),_=u.readS32(),f=_*w,m=Memory.alloc(2*f);Memory.copy(m,h,f),p.writePointer(m),a={classObject:s,vtablePtr:p,vtableCountPtr:u,vtable:h,vtableCount:_,shadowVtable:m,shadowVtableCount:_,targetMethods:new Map},Nt.set(l,a)}let c=this.methodId.toString(16),d=a.targetMethods.get(c);if(d===void 0){d=Memory.dup(this.originalMethod,ln);let p=a.shadowVtableCount++;a.shadowVtable.add(p*w).writePointer(d),d.add(Aa).writeU16(p),a.vtableCountPtr.writeS32(a.shadowVtableCount),a.targetMethods.set(c,d)}return d}}function ac(e){if(Process.arch!=="ia32")return Cr;let t=e.add(ka).readPointer().readCString();if(t===null||t.length===0||t.length>65535)return Cr;let n;switch(t[0]){case"V":n=ja;break;case"F":n=Oa;break;case"D":n=Ra;break;case"J":n=Pa;break;case"Z":case"B":n=za;break;case"C":n=Ua;break;case"S":n=Da;break;default:n=Fa;break}let r=0;for(let o=t.length-1;o>0;o--){let i=t[o];r+=i==="D"||i==="J"?2:1}return n<<Va|r}function lc(e,t){let n=B();if(ee()<23){let r=n["art::Thread::CurrentFromGdb"]();return n["art::mirror::Object::Clone"](e,r)}if(n.isUserfaultfdGcActive)return cc(e,t);return Memory.dup(e,pe(t).size)}function cc(e,t){let n=e.toString(),r=Tr.get(n);if(r===void 0){let o=B();t.perform((i)=>{he(t,i,()=>{r=o["art::Runtime::CreateCalleeSaveMethod"](o.artRuntime),Memory.copy(r,e,pe(t).size)})}),Tr.set(n,r)}return r}function Rn(e,t,n){eo(e,t,yn,n)}function Pn(e,t){eo(e,t,bn)}function Fn(e,t){let n=B();if(ee()<26)throw Error("This API is only available on Android >= 8.0");he(e,t,(r)=>{n["art::Runtime::DeoptimizeBootImage"](n.artRuntime)})}function Dn(e,t,n){let r=B();if(ee()<24)throw Error("This API is only available on Android >= 7.0");let o=r.artInstrumentation;if(o===null)throw Error("Unable to find Instrumentation class in ART; please file a bug");let i=!1;return he(e,t,()=>{i=!!r["art::Instrumentation::IsDeoptimized"](o,n)}),i}function eo(e,t,n,r){let o=B();if(ee()<24)throw Error("This API is only available on Android >= 7.0");he(e,t,(i)=>{if(ee()<30){if(!o.isJdwpStarted()){let l=dc(o);Ka.push(l)}if(!o.isDebuggerActive())o["art::Dbg::GoActive"]();let s=Memory.alloc(8+w);switch(s.writeU32(n),n){case bn:break;case yn:s.add(8).writePointer(r);break;default:throw Error("Unsupported deoptimization kind")}o["art::Dbg::RequestDeoptimization"](s),o["art::Dbg::ManageDeoptimization"]()}else{let s=o.artInstrumentation;if(s===null)throw Error("Unable to find Instrumentation class in ART; please file a bug");let l=o["art::Instrumentation::EnableDeoptimization"];if(l!==void 0){if(!s.add($a().offset.deoptimizationEnabled).readU8())l(s)}switch(n){case bn:o["art::Instrumentation::DeoptimizeEverything"](s,Memory.allocUtf8String("frida"));break;case yn:o["art::Instrumentation::Deoptimize"](s,r);break;default:throw Error("Unsupported deoptimization kind")}}})}class to{constructor(){let e=Process.getModuleByName("libart.so"),t=e.getExportByName("_ZN3art4JDWP12JdwpAdbState6AcceptEv"),n=e.getExportByName("_ZN3art4JDWP12JdwpAdbState15ReceiveClientFdEv"),r=Dr(),o=Dr();this._controlFd=r[0],this._clientFd=o[0];let i=null;i=Interceptor.attach(t,function(s){let l=s[0];Memory.scanSync(l.add(8252),256,"00 ff ff ff ff 00")[0].address.add(1).writeS32(r[1]),i.detach()}),Interceptor.replace(n,new NativeCallback(function(s){return Interceptor.revert(n),o[1]},"int",["pointer"])),Interceptor.flush(),this._handshakeRequest=this._performHandshake()}async _performHandshake(){let e=new UnixInputStream(this._clientFd,{autoClose:!1}),t=new UnixOutputStream(this._clientFd,{autoClose:!1}),n=[74,68,87,80,45,72,97,110,100,115,104,97,107,101];try{await t.writeAll(n),await e.readAll(n.length)}catch(r){}}}function dc(e){let t=new to;e["art::Dbg::SetJdwpAllowed"](1);let n=uc();e["art::Dbg::ConfigureJdwp"](n);let r=e["art::InternalDebuggerControlCallback::StartDebugger"];if(r!==void 0)r(NULL);else e["art::Dbg::StartJdwp"]();return t}function uc(){let e=ee()<28?2:3,t=0,n=e,r=!0,o=!1,i=0,s=8+at+2,l=Memory.alloc(s);return l.writeU32(n).add(4).writeU8(1).add(1).writeU8(0).add(1).add(at).writeU16(0),l}function Dr(){if(pn===null)pn=new NativeFunction(Process.getModuleByName("libc.so").getExportByName("socketpair"),"int",["int","int","int","pointer"]);let e=Memory.alloc(8);if(pn(Ja,Ga,0,e)===-1)throw Error("Unable to create socketpair for JDWP");return[e.readS32(),e.add(4).readS32()]}function pc(e){let t=tl().offset,n=e.vm.add(t.globalsLock),r=e.vm.add(t.globals),o=e["art::IndirectReferenceTable::Add"],i=e["art::ReaderWriterMutex::ExclusiveLock"],s=e["art::ReaderWriterMutex::ExclusiveUnlock"],l=0;return function(a,c,d){i(n,c);try{return o(r,0,d)}finally{s(n,c)}}}function hc(e){let t=e["art::Thread::DecodeJObject"];if(t===void 0)throw Error("art::Thread::DecodeJObject is not available; please file a bug");return function(n,r,o){return t(r,o)}}var fc={ia32:Ur,x64:Ur,arm:_c,arm64:mc};function no(e,t,n){let r=B(),o=t.handle.readPointer(),i,s=r.find("_ZN3art3JNIILb1EE14ExceptionClearEP7_JNIEnv");if(s!==null)i=s;else i=o.add(Lt).readPointer();let l,a=r.find("_ZN3art3JNIILb1EE10FatalErrorEP7_JNIEnvPKc");if(a!==null)l=a;else l=o.add(wa).readPointer();let c=fc[Process.arch];if(c===void 0)throw Error("Not yet implemented for "+Process.arch);let d=null,p=qe(e).offset,u=p.exception,h=new Set,_=p.isExceptionReportedToInstrumentation;if(_!==null)h.add(_);let f=p.throwLocation;if(f!==null)h.add(f),h.add(f+w),h.add(f+2*w);let m=65536,y=Memory.alloc(m);return Memory.patchCode(y,m,(E)=>{d=c(E,y,i,l,u,h,n)}),d._code=y,d._callback=n,d}function Ur(e,t,n,r,o,i,s){let l={},a=new Set,c=[n];while(c.length>0){let f=c.shift();if(Object.values(l).some(({begin:O,end:M})=>f.compare(O)>=0&&f.compare(M)<0))continue;let y=f.toString(),E={begin:f},k=null,T=!1;do{if(f.equals(r)){T=!0;break}let O=Instruction.parse(f);k=O;let M=l[O.address.toString()];if(M!==void 0){delete l[M.begin.toString()],l[y]=M,M.begin=E.begin,E=null;break}let j=null;switch(O.mnemonic){case"jmp":j=ptr(O.operands[0].value),T=!0;break;case"je":case"jg":case"jle":case"jne":case"js":j=ptr(O.operands[0].value);break;case"ret":T=!0;break}if(j!==null)a.add(j.toString()),c.push(j),c.sort((v,L)=>v.compare(L));f=O.next}while(!T);if(E!==null)E.end=k.address.add(k.size),l[y]=E}let d=Object.keys(l).map((f)=>l[f]);d.sort((f,m)=>f.begin.compare(m.begin));let p=l[n.toString()];d.splice(d.indexOf(p),1),d.unshift(p);let u=new X86Writer(e,{pc:t}),h=!1,_=null;if(d.forEach((f)=>{let m=f.end.sub(f.begin).toInt32(),y=new X86Relocator(f.begin,u),E;while((E=y.readOne())!==0){let k=y.input,{mnemonic:T}=k,O=k.address.toString();if(a.has(O))u.putLabel(O);let M=!0;switch(T){case"jmp":u.putJmpNearLabel(ue(k.operands[0])),M=!1;break;case"je":case"jg":case"jle":case"jne":case"js":u.putJccNearLabel(T,ue(k.operands[0]),"no-hint"),M=!1;break;case"mov":{let[j,v]=k.operands;if(j.type==="mem"&&v.type==="imm"){let L=j.value,S=L.disp;if(S===o&&v.value.valueOf()===0){if(_=L.base,u.putPushfx(),u.putPushax(),u.putMovRegReg("xbp","xsp"),w===4)u.putAndRegU32("esp",4294967280);else{let x=_!=="rdi"?"rdi":"rsi";u.putMovRegU64(x,uint64("0xfffffffffffffff0")),u.putAndRegReg("rsp",x)}u.putCallAddressWithAlignedArguments(s,[_]),u.putMovRegReg("xsp","xbp"),u.putPopax(),u.putPopfx(),h=!0,M=!1}else if(i.has(S)&&L.base===_)M=!1}break}case"call":{let j=k.operands[0];if(j.type==="mem"&&j.value.disp===Lt){if(w===4)u.putPopReg("eax"),u.putMovRegRegOffsetPtr("eax","eax",4),u.putPushReg("eax");else u.putMovRegRegOffsetPtr("rdi","rdi",8);u.putCallAddressWithArguments(s,[]),h=!0,M=!1}break}}if(M)y.writeAll();else y.skipOne();if(E===m)break}y.dispose()}),u.dispose(),!h)Un();return new NativeFunction(t,"void",["pointer"],X)}function _c(e,t,n,r,o,i,s){let l={},a=new Set,c=ptr(1).not(),d=[n];while(d.length>0){let y=d.shift();if(Object.values(l).some(({begin:S,end:x})=>y.compare(S)>=0&&y.compare(x)<0))continue;let k=y.and(c),T=k.toString(),O=y.and(1),M={begin:k},j=null,v=!1,L=0;do{if(y.equals(r)){v=!0;break}let S;try{S=Instruction.parse(y)}catch(V){if(j!==null){v=!0;break}throw V}let{mnemonic:x}=S;j=S;let P=y.and(c).toString(),F=l[P];if(F!==void 0){delete l[F.begin.toString()],l[T]=F,F.begin=M.begin,M=null;break}let z=L===0,D=null;switch(x){case"b":D=ptr(S.operands[0].value),v=z;break;case"beq.w":case"beq":case"bne":case"bne.w":case"bgt":D=ptr(S.operands[0].value);break;case"cbz":case"cbnz":D=ptr(S.operands[1].value);break;case"pop.w":if(z)v=S.operands.filter((V)=>V.value==="pc").length===1;break}switch(x){case"it":L=1;break;case"itt":L=2;break;case"ittt":L=3;break;case"itttt":L=4;break;default:if(L>0)L--;break}if(D!==null)a.add(D.toString()),d.push(D.or(O)),d.sort((V,Z)=>V.compare(Z));y=S.next}while(!v);if(M!==null)M.end=j.address.add(j.size),l[T]=M}let p=Object.keys(l).map((y)=>l[y]);p.sort((y,E)=>y.begin.compare(E.begin));let u=l[n.and(c).toString()];p.splice(p.indexOf(u),1),p.unshift(u);let h=new ThumbWriter(e,{pc:t}),_=!1,f=null,m=null;if(p.forEach((y)=>{let E=new ThumbRelocator(y.begin,h),{begin:k,end:T}=y,O=0;do{if(E.readOne()===0)throw Error("Unexpected end of block");let j=E.input;k=j.address,O=j.size;let{mnemonic:v}=j,L=k.toString();if(a.has(L))h.putLabel(L);let S=!0;switch(v){case"b":h.putBLabel(ue(j.operands[0])),S=!1;break;case"beq.w":h.putBCondLabelWide("eq",ue(j.operands[0])),S=!1;break;case"bne.w":h.putBCondLabelWide("ne",ue(j.operands[0])),S=!1;break;case"beq":case"bne":case"bgt":h.putBCondLabelWide(v.substr(1),ue(j.operands[0])),S=!1;break;case"cbz":{let x=j.operands;h.putCbzRegLabel(x[0].value,ue(x[1])),S=!1;break}case"cbnz":{let x=j.operands;h.putCbnzRegLabel(x[0].value,ue(x[1])),S=!1;break}case"str":case"str.w":{let x=j.operands[1].value,I=x.disp;if(I===o){f=x.base;let P=f!=="r4"?"r4":"r5",F=["r0","r1","r2","r3",P,"r9","r12","lr"];h.putPushRegs(F),h.putMrsRegReg(P,"apsr-nzcvq"),h.putCallAddressWithArguments(s,[f]),h.putMsrRegReg("apsr-nzcvq",P),h.putPopRegs(F),_=!0,S=!1}else if(i.has(I)&&x.base===f)S=!1;break}case"ldr":{let[x,I]=j.operands;if(I.type==="mem"){let P=I.value;if(P.base[0]==="r"&&P.disp===Lt)m=x.value}break}case"blx":if(j.operands[0].value===m)h.putLdrRegRegOffset("r0","r0",4),h.putCallAddressWithArguments(s,["r0"]),_=!0,m=null,S=!1;break}if(S)E.writeAll();else E.skipOne()}while(!k.add(O).equals(T));E.dispose()}),h.dispose(),!_)Un();return new NativeFunction(t.or(1),"void",["pointer"],X)}function mc(e,t,n,r,o,i,s){let l={},a=new Set,c=[n];while(c.length>0){let E=c.shift();if(Object.values(l).some(({begin:v,end:L})=>E.compare(v)>=0&&E.compare(L)<0))continue;let T=E.toString(),O={begin:E},M=null,j=!1;do{if(E.equals(r)){j=!0;break}let v;try{v=Instruction.parse(E)}catch(x){if(E.readU32()===0){j=!0;break}else throw x}M=v;let L=l[v.address.toString()];if(L!==void 0){delete l[L.begin.toString()],l[T]=L,L.begin=O.begin,O=null;break}let S=null;switch(v.mnemonic){case"b":S=ptr(v.operands[0].value),j=!0;break;case"b.eq":case"b.ne":case"b.le":case"b.gt":S=ptr(v.operands[0].value);break;case"cbz":case"cbnz":S=ptr(v.operands[1].value);break;case"tbz":case"tbnz":S=ptr(v.operands[2].value);break;case"ret":j=!0;break}if(S!==null)a.add(S.toString()),c.push(S),c.sort((x,I)=>x.compare(I));E=v.next}while(!j);if(O!==null)O.end=M.address.add(M.size),l[T]=O}let d=Object.keys(l).map((E)=>l[E]);d.sort((E,k)=>E.begin.compare(k.begin));let p=l[n.toString()];d.splice(d.indexOf(p),1),d.unshift(p);let u=new Arm64Writer(e,{pc:t}),h=t.add(u.offset);u.putPushAllXRegisters(),u.putCallAddressWithArguments(s,["x0"]),u.putPopAllXRegisters(),u.putRet(),u.flush();let _=t.add(u.offset),f=!1,m=null,y=null;if(d.forEach((E)=>{let k=E.end.sub(E.begin).toInt32(),T=new Arm64Relocator(E.begin,u),O;while((O=T.readOne())!==0){let M=T.input,{mnemonic:j}=M,v=M.address.toString();if(a.has(v))u.putLabel(v);let L=!0;switch(j){case"b":u.putBLabel(ue(M.operands[0])),L=!1;break;case"b.eq":case"b.ne":case"b.le":case"b.gt":u.putBCondLabel(j.substr(2),ue(M.operands[0])),L=!1;break;case"cbz":{let S=M.operands;u.putCbzRegLabel(S[0].value,ue(S[1])),L=!1;break}case"cbnz":{let S=M.operands;u.putCbnzRegLabel(S[0].value,ue(S[1])),L=!1;break}case"tbz":{let S=M.operands;u.putTbzRegImmLabel(S[0].value,S[1].value.valueOf(),ue(S[2])),L=!1;break}case"tbnz":{let S=M.operands;u.putTbnzRegImmLabel(S[0].value,S[1].value.valueOf(),ue(S[2])),L=!1;break}case"str":{let S=M.operands,x=S[0].value,I=S[1].value,P=I.disp;if(x==="xzr"&&P===o)m=I.base,u.putPushRegReg("x0","lr"),u.putMovRegReg("x0",m),u.putBlImm(h),u.putPopRegReg("x0","lr"),f=!0,L=!1;else if(i.has(P)&&I.base===m)L=!1;break}case"ldr":{let S=M.operands,x=S[1].value;if(x.base[0]==="x"&&x.disp===Lt)y=S[0].value;break}case"blr":if(M.operands[0].value===y)u.putLdrRegRegOffset("x0","x0",8),u.putCallAddressWithArguments(s,["x0"]),f=!0,y=null,L=!1;break}if(L)T.writeAll();else T.skipOne();if(O===k)break}T.dispose()}),u.dispose(),!f)Un();return new NativeFunction(_,"void",["pointer"],X)}function Un(){throw Error("Unable to parse ART internals; please file a bug")}function gc(e){let t=e["art::ArtMethod::PrettyMethod"];if(t===void 0)return;Interceptor.attach(t.impl,re.hooks.ArtMethod.prettyMethod),Interceptor.flush()}function ue(e){return ptr(e.value).toString()}function bc(e,t){return new NativeFunction(e,"pointer",t,X)}function yc(e,t){let n=new NativeFunction(e,"void",["pointer"].concat(t),X);return function(){let r=Memory.alloc(w);return n(r,...arguments),r.readPointer()}}function Tt(e,t){let{arch:n}=Process;switch(n){case"ia32":case"arm64":{let r;if(n==="ia32")r=We(64,(s)=>{let l=1+t.length,a=l*4;s.putSubRegImm("esp",a);for(let c=0;c!==l;c++){let d=c*4;s.putMovRegRegOffsetPtr("eax","esp",a+4+d),s.putMovRegOffsetPtrReg("esp",d,"eax")}s.putCallAddress(e),s.putAddRegImm("esp",a-4),s.putRet()});else r=We(32,(s)=>{s.putMovRegReg("x8","x0"),t.forEach((l,a)=>{s.putMovRegReg("x"+a,"x"+(a+1))}),s.putLdrRegAddress("x7",e),s.putBrReg("x7")});let o=new NativeFunction(r,"void",["pointer"].concat(t),X),i=function(...s){o(...s)};return i.handle=r,i.impl=e,i}default:{let r=new NativeFunction(e,"void",["pointer"].concat(t),X);return r.impl=e,r}}}class zn{constructor(){this.handle=Memory.alloc(at)}dispose(){let[e,t]=this._getData();if(!t)B().$delete(e)}disposeToString(){let e=this.toString();return this.dispose(),e}toString(){let[e]=this._getData();return e.readUtf8String()}_getData(){let e=this.handle,t=(e.readU8()&1)===0;return[t?e.add(1):e.add(2*w).readPointer(),t]}}class ro{$delete(){this.dispose(),B().$delete(this)}constructor(e,t){this.handle=e,this._begin=e,this._end=e.add(w),this._storage=e.add(2*w),this._elementSize=t}init(){this.begin=NULL,this.end=NULL,this.storage=NULL}dispose(){B().$delete(this.begin)}get begin(){return this._begin.readPointer()}set begin(e){this._begin.writePointer(e)}get end(){return this._end.readPointer()}set end(e){this._end.writePointer(e)}get storage(){return this._storage.readPointer()}set storage(e){this._storage.writePointer(e)}get size(){return this.end.sub(this.begin).toInt32()/this._elementSize}}class ct extends ro{static $new(){let e=new ct(B().$new(Ba));return e.init(),e}constructor(e){super(e,w)}get handles(){let e=[],t=this.begin,n=this.end;while(!t.equals(n))e.push(t.readPointer()),t=t.add(w);return e}}var Ec=0,oo=w,io=oo+4,vc=-1;class xt{$delete(){this.dispose(),B().$delete(this)}constructor(e){this.handle=e,this._link=e.add(Ec),this._numberOfReferences=e.add(oo)}init(e,t){this.link=e,this.numberOfReferences=t}dispose(){}get link(){return new xt(this._link.readPointer())}set link(e){this._link.writePointer(e)}get numberOfReferences(){return this._numberOfReferences.readS32()}set numberOfReferences(e){this._numberOfReferences.writeS32(e)}}var so=Cc(io),ao=so+w,Sc=ao+w;class dt extends xt{static $new(e,t){let n=new dt(B().$new(Sc));return n.init(e,t),n}constructor(e){super(e);this._self=e.add(so),this._currentScope=e.add(ao);let r=(64-w-4-4)/4;this._scopeLayout=st.layoutForCapacity(r),this._topHandleScopePtr=null}init(e,t){let n=e.add(qe(t).offset.topHandleScope);this._topHandleScopePtr=n,super.init(n.readPointer(),vc),this.self=e,this.currentScope=st.$new(this._scopeLayout),n.writePointer(this)}dispose(){this._topHandleScopePtr.writePointer(this.link);let e;while((e=this.currentScope)!==null){let t=e.link;e.$delete(),this.currentScope=t}}get self(){return this._self.readPointer()}set self(e){this._self.writePointer(e)}get currentScope(){let e=this._currentScope.readPointer();if(e.isNull())return null;return new st(e,this._scopeLayout)}set currentScope(e){this._currentScope.writePointer(e)}newHandle(e){return this.currentScope.newHandle(e)}}class st extends xt{static $new(e){let t=new st(B().$new(e.size),e);return t.init(),t}constructor(e,t){super(e);let{offset:n}=t;this._refsStorage=e.add(n.refsStorage),this._pos=e.add(n.pos),this._layout=t}init(){super.init(NULL,this._layout.numberOfReferences),this.pos=0}get pos(){return this._pos.readU32()}set pos(e){this._pos.writeU32(e)}newHandle(e){let t=this.pos,n=this._refsStorage.add(t*4);return n.writeS32(e.toInt32()),this.pos=t+1,n}static layoutForCapacity(e){let t=io,n=t+e*4;return{size:n+4,numberOfReferences:e,offset:{refsStorage:t,pos:n}}}}var wc={arm:function(e,t){let n=Process.pageSize,r=Memory.alloc(n);Memory.protect(r,n,"rwx");let o=new NativeCallback(t,"void",["pointer"]);r._onMatchCallback=o;let i=[26625,18947,17041,53505,19202,18200,18288,48896],s=i.length*2,l=s+4,a=l+4;return Memory.patchCode(r,a,function(c){i.forEach((d,p)=>{c.add(p*2).writeU16(d)}),c.add(s).writeS32(e),c.add(l).writePointer(o)}),r.or(1)},arm64:function(e,t){let n=Process.pageSize,r=Memory.alloc(n);Memory.protect(r,n,"rwx");let o=new NativeCallback(t,"void",["pointer"]);r._onMatchCallback=o;let i=[3107979265,402653378,1795293247,1409286241,1476395139,3592355936,3596551104],s=i.length*4,l=s+4,a=l+8;return Memory.patchCode(r,a,function(c){i.forEach((d,p)=>{c.add(p*4).writeU32(d)}),c.add(s).writeS32(e),c.add(l).writePointer(o)}),r}};function Vn(e,t){return(wc[Process.arch]||Ic)(e,t)}function Ic(e,t){return new NativeCallback((n)=>{if(n.readS32()===e)t(n)},"void",["pointer","pointer"])}function Cc(e){let t=e%w;if(t!==0)return e+w-t;return e}var Tc=4,{pointerSize:J}=Process,Ac=256,Nc=65536,Lc=131072,Mc=33554432,kc=67108864,xc=134217728,ze={exceptions:"propagate"},po=se($c),jc=se(Zc),Oc=se(Bc),Bn=null,Jn=!1,Ot=new Map,ut=new Map;function we(){if(Bn===null)Bn=Rc();return Bn}function Rc(){let e=Process.enumerateModules().filter((a)=>/jvm.(dll|dylib|so)$/.test(a.name));if(e.length===0)return null;let t=e[0],n={flavor:"jvm"},r=Process.platform==="windows"?[{module:t,functions:{JNI_GetCreatedJavaVMs:["JNI_GetCreatedJavaVMs","int",["pointer","int","pointer"]],JVM_Sleep:["JVM_Sleep","void",["pointer","pointer","long"]],"VMThread::execute":["VMThread::execute","void",["pointer"]],"Method::size":["Method::size","int",["int"]],"Method::set_native_function":["Method::set_native_function","void",["pointer","pointer","int"]],"Method::clear_native_function":["Method::clear_native_function","void",["pointer"]],"Method::jmethod_id":["Method::jmethod_id","pointer",["pointer"]],"ClassLoaderDataGraph::classes_do":["ClassLoaderDataGraph::classes_do","void",["pointer"]],"NMethodSweeper::sweep_code_cache":["NMethodSweeper::sweep_code_cache","void",[]],"OopMapCache::flush_obsolete_entries":["OopMapCache::flush_obsolete_entries","void",["pointer"]]},variables:{"VM_RedefineClasses::`vftable'":function(a){this.vtableRedefineClasses=a},"VM_RedefineClasses::doit":function(a){this.redefineClassesDoIt=a},"VM_RedefineClasses::doit_prologue":function(a){this.redefineClassesDoItPrologue=a},"VM_RedefineClasses::doit_epilogue":function(a){this.redefineClassesDoItEpilogue=a},"VM_RedefineClasses::allow_nested_vm_operations":function(a){this.redefineClassesAllow=a},"NMethodSweeper::_traversals":function(a){this.traversals=a},"NMethodSweeper::_should_sweep":function(a){this.shouldSweep=a}},optionals:[]}]:[{module:t,functions:{JNI_GetCreatedJavaVMs:["JNI_GetCreatedJavaVMs","int",["pointer","int","pointer"]],_ZN6Method4sizeEb:["Method::size","int",["int"]],_ZN6Method19set_native_functionEPhb:["Method::set_native_function","void",["pointer","pointer","int"]],_ZN6Method21clear_native_functionEv:["Method::clear_native_function","void",["pointer"]],_ZN6Method24restore_unshareable_infoEP10JavaThread:["Method::restore_unshareable_info","void",["pointer","pointer"]],_ZN6Method24restore_unshareable_infoEP6Thread:["Method::restore_unshareable_info","void",["pointer","pointer"]],_ZN6Method11link_methodERK12methodHandleP10JavaThread:["Method::link_method","void",["pointer","pointer","pointer"]],_ZN6Method10jmethod_idEv:["Method::jmethod_id","pointer",["pointer"]],_ZN6Method10clear_codeEv:function(a){let c=new NativeFunction(a,"void",["pointer"],ze);this["Method::clear_code"]=function(d){c(d)}},_ZN6Method10clear_codeEb:function(a){let c=new NativeFunction(a,"void",["pointer","int"],ze),d=0;this["Method::clear_code"]=function(p){c(p,0)}},_ZN18VM_RedefineClasses19mark_dependent_codeEP13InstanceKlass:["VM_RedefineClasses::mark_dependent_code","void",["pointer","pointer"]],_ZN18VM_RedefineClasses20flush_dependent_codeEv:["VM_RedefineClasses::flush_dependent_code","void",[]],_ZN18VM_RedefineClasses20flush_dependent_codeEP13InstanceKlassP6Thread:["VM_RedefineClasses::flush_dependent_code","void",["pointer","pointer","pointer"]],_ZN18VM_RedefineClasses20flush_dependent_codeE19instanceKlassHandleP6Thread:["VM_RedefineClasses::flush_dependent_code","void",["pointer","pointer","pointer"]],_ZN19ResolvedMethodTable21adjust_method_entriesEPb:["ResolvedMethodTable::adjust_method_entries","void",["pointer"]],_ZN15MemberNameTable21adjust_method_entriesEP13InstanceKlassPb:["MemberNameTable::adjust_method_entries","void",["pointer","pointer","pointer"]],_ZN17ConstantPoolCache21adjust_method_entriesEPb:function(a){let c=new NativeFunction(a,"void",["pointer","pointer"],ze);this["ConstantPoolCache::adjust_method_entries"]=function(d,p,u){c(d,u)}},_ZN17ConstantPoolCache21adjust_method_entriesEP13InstanceKlassPb:function(a){let c=new NativeFunction(a,"void",["pointer","pointer","pointer"],ze);this["ConstantPoolCache::adjust_method_entries"]=function(d,p,u){c(d,p,u)}},_ZN20ClassLoaderDataGraph10classes_doEP12KlassClosure:["ClassLoaderDataGraph::classes_do","void",["pointer"]],_ZN20ClassLoaderDataGraph22clean_deallocate_listsEb:["ClassLoaderDataGraph::clean_deallocate_lists","void",["int"]],_ZN10JavaThread27thread_from_jni_environmentEP7JNIEnv_:["JavaThread::thread_from_jni_environment","pointer",["pointer"]],_ZN8VMThread7executeEP12VM_Operation:["VMThread::execute","void",["pointer"]],_ZN11OopMapCache22flush_obsolete_entriesEv:["OopMapCache::flush_obsolete_entries","void",["pointer"]],_ZN14NMethodSweeper11force_sweepEv:["NMethodSweeper::force_sweep","void",[]],_ZN14NMethodSweeper16sweep_code_cacheEv:["NMethodSweeper::sweep_code_cache","void",[]],_ZN14NMethodSweeper17sweep_in_progressEv:["NMethodSweeper::sweep_in_progress","bool",[]],JVM_Sleep:["JVM_Sleep","void",["pointer","pointer","long"]]},variables:{_ZN18VM_RedefineClasses14_the_class_oopE:function(a){this.redefineClass=a},_ZN18VM_RedefineClasses10_the_classE:function(a){this.redefineClass=a},_ZN18VM_RedefineClasses25AdjustCpoolCacheAndVtable8do_klassEP5Klass:function(a){this.doKlass=a},_ZN18VM_RedefineClasses22AdjustAndCleanMetadata8do_klassEP5Klass:function(a){this.doKlass=a},_ZTV18VM_RedefineClasses:function(a){this.vtableRedefineClasses=a},_ZN18VM_RedefineClasses4doitEv:function(a){this.redefineClassesDoIt=a},_ZN18VM_RedefineClasses13doit_prologueEv:function(a){this.redefineClassesDoItPrologue=a},_ZN18VM_RedefineClasses13doit_epilogueEv:function(a){this.redefineClassesDoItEpilogue=a},_ZN18VM_RedefineClassesD0Ev:function(a){this.redefineClassesDispose0=a},_ZN18VM_RedefineClassesD1Ev:function(a){this.redefineClassesDispose1=a},_ZNK18VM_RedefineClasses26allow_nested_vm_operationsEv:function(a){this.redefineClassesAllow=a},_ZNK18VM_RedefineClasses14print_on_errorEP12outputStream:function(a){this.redefineClassesOnError=a},_ZN13InstanceKlass33create_new_default_vtable_indicesEiP10JavaThread:function(a){this.createNewDefaultVtableIndices=a},_ZN13InstanceKlass33create_new_default_vtable_indicesEiP6Thread:function(a){this.createNewDefaultVtableIndices=a},_ZN19Abstract_VM_Version19jre_release_versionEv:function(a){let d=new NativeFunction(a,"pointer",[],ze)().readCString();this.version=d.startsWith("1.8")?8:d.startsWith("9.")?9:parseInt(d.slice(0,2),10),this.versionS=d},_ZN14NMethodSweeper11_traversalsE:function(a){this.traversals=a},_ZN14NMethodSweeper21_sweep_fractions_leftE:function(a){this.fractions=a},_ZN14NMethodSweeper13_should_sweepE:function(a){this.shouldSweep=a}},optionals:["_ZN6Method24restore_unshareable_infoEP10JavaThread","_ZN6Method24restore_unshareable_infoEP6Thread","_ZN6Method11link_methodERK12methodHandleP10JavaThread","_ZN6Method10clear_codeEv","_ZN6Method10clear_codeEb","_ZN18VM_RedefineClasses19mark_dependent_codeEP13InstanceKlass","_ZN18VM_RedefineClasses20flush_dependent_codeEv","_ZN18VM_RedefineClasses20flush_dependent_codeEP13InstanceKlassP6Thread","_ZN18VM_RedefineClasses20flush_dependent_codeE19instanceKlassHandleP6Thread","_ZN19ResolvedMethodTable21adjust_method_entriesEPb","_ZN15MemberNameTable21adjust_method_entriesEP13InstanceKlassPb","_ZN17ConstantPoolCache21adjust_method_entriesEPb","_ZN17ConstantPoolCache21adjust_method_entriesEP13InstanceKlassPb","_ZN20ClassLoaderDataGraph22clean_deallocate_listsEb","_ZN10JavaThread27thread_from_jni_environmentEP7JNIEnv_","_ZN14NMethodSweeper11force_sweepEv","_ZN14NMethodSweeper17sweep_in_progressEv","_ZN18VM_RedefineClasses14_the_class_oopE","_ZN18VM_RedefineClasses10_the_classE","_ZN18VM_RedefineClasses25AdjustCpoolCacheAndVtable8do_klassEP5Klass","_ZN18VM_RedefineClasses22AdjustAndCleanMetadata8do_klassEP5Klass","_ZN18VM_RedefineClassesD0Ev","_ZN18VM_RedefineClassesD1Ev","_ZNK18VM_RedefineClasses14print_on_errorEP12outputStream","_ZN13InstanceKlass33create_new_default_vtable_indicesEiP10JavaThread","_ZN13InstanceKlass33create_new_default_vtable_indicesEiP6Thread","_ZN14NMethodSweeper21_sweep_fractions_leftE"]}],o=[];if(r.forEach(function(a){let c=a.module,d=a.functions||{},p=a.variables||{},u=new Set(a.optionals||[]),h=c.enumerateExports().reduce(function(f,m){return f[m.name]=m,f},{}),_=c.enumerateSymbols().reduce(function(f,m){return f[m.name]=m,f},h);Object.keys(d).forEach(function(f){let m=_[f];if(m!==void 0){let y=d[f];if(typeof y==="function")y.call(n,m.address);else n[y[0]]=new NativeFunction(m.address,y[1],y[2],ze)}else if(!u.has(f))o.push(f)}),Object.keys(p).forEach(function(f){let m=_[f];if(m!==void 0)p[f].call(n,m.address);else if(!u.has(f))o.push(f)})}),o.length>0)throw Error("Java API only partially available; please file a bug. Missing: "+o.join(", "));let i=Memory.alloc(J),s=Memory.alloc(Tc);if(ce("JNI_GetCreatedJavaVMs",n.JNI_GetCreatedJavaVMs(i,1,s)),s.readInt()===0)return null;n.vm=i.readPointer();let l=Process.platform==="windows"?{$new:["??2@YAPEAX_K@Z","pointer",["ulong"]],$delete:["??3@YAXPEAX@Z","void",["pointer"]]}:{$new:["_Znwm","pointer",["ulong"]],$delete:["_ZdlPv","void",["pointer"]]};for(let[a,[c,d,p]]of Object.entries(l)){let u=Module.findGlobalExportByName(c);if(u===null){if(u=DebugSymbol.fromName(c).address,u.isNull())throw Error(`unable to find C++ allocator API, missing: '${c}'`)}n[a]=new NativeFunction(u,d,p,ze)}if(n.jvmti=Pc(n),n["JavaThread::thread_from_jni_environment"]===void 0)n["JavaThread::thread_from_jni_environment"]=Dc(n);return n}function Pc(e){let t=new Se(e),n;return t.perform(()=>{let r=t.tryGetEnvHandle(yt.v1_0);if(r===null)throw Error("JVMTI not available");n=new Ae(r,t);let o=Memory.alloc(8);o.writeU64(Et.canTagObjects);let i=n.addCapabilities(o);ce("getEnvJvmti::AddCapabilities",i)}),n}var Fc={x64:Uc};function Dc(e){let t=null,n=Fc[Process.arch];if(n!==void 0){let o=new Se(e).perform((i)=>i.handle.readPointer().add(6*J).readPointer());t=Ne(o,n,{limit:11})}if(t===null)return()=>{throw Error("Unable to make thread_from_jni_environment() helper for the current architecture")};return(r)=>r.add(t)}function Uc(e){if(e.mnemonic!=="lea")return null;let{base:t,disp:n}=e.operands[1].value;if(!(t==="rdi"&&n<0))return null;return n}function ho(e,t){}class fo{constructor(e){this.methodId=e,this.method=e.readPointer(),this.originalMethod=null,this.newMethod=null,this.resolved=null,this.impl=null,this.key=e.toString(16)}replace(e,t,n,r,o){let{key:i}=this,s=ut.get(i);if(s!==void 0)ut.delete(i),this.method=s.method,this.originalMethod=s.originalMethod,this.newMethod=s.newMethod,this.resolved=s.resolved;this.impl=e,Ot.set(i,this),lo(r)}revert(e){let{key:t}=this;Ot.delete(t),ut.set(t,this),lo(e)}resolveTarget(e,t,n,r){let{resolved:o,originalMethod:i,methodId:s}=this;if(o!==null)return o;if(i===null)return s;i.oldMethod.vtableIndexPtr.writeS32(-2);let a=Memory.alloc(J);return a.writePointer(this.method),this.resolved=a,a}}function lo(e){if(!Jn)Jn=!0,Script.nextTick(zc,e)}function zc(e){let t=new Map(Ot),n=new Map(ut);Ot.clear(),ut.clear(),Jn=!1,e.perform((r)=>{let o=we(),i=o["JavaThread::thread_from_jni_environment"](r.handle),s=!1;if(_o(()=>{t.forEach((l)=>{let{method:a,originalMethod:c,impl:d,methodId:p,newMethod:u}=l;if(c===null)l.originalMethod=go(a),l.newMethod=Jc(a,d,i),co(l.newMethod,p,i);else o["Method::set_native_function"](u.method,d,0)}),n.forEach((l)=>{let{originalMethod:a,methodId:c,newMethod:d}=l;if(a!==null){Gc(a);let p=a.oldMethod;p.oldMethod=d,co(p,c,i),s=!0}})}),s)Vc(r.handle)})}function Vc(e){let{fractions:t,shouldSweep:n,traversals:r,"NMethodSweeper::sweep_code_cache":o,"NMethodSweeper::sweep_in_progress":i,"NMethodSweeper::force_sweep":s,JVM_Sleep:l}=we();if(s!==void 0)Thread.sleep(0.05),s(),Thread.sleep(0.05),s();else{let a=r.readS64(),c=a+2;while(c>a){if(t.writeS32(1),l(e,NULL,50),!i())_o(()=>{Thread.sleep(0.05)});if(n.readU8()===0)t.writeS32(1),o();a=r.readS64()}}}function _o(e,t,n){let{execute:r,vtable:o,vtableSize:i,doItOffset:s,prologueOffset:l,epilogueOffset:a}=Oc(),c=Memory.dup(o,i),d=Memory.alloc(J*25);d.writePointer(c);let p=new NativeCallback(e,"void",["pointer"]);c.add(s).writePointer(p);let u=null;if(t!==void 0)u=new NativeCallback(t,"int",["pointer"]),c.add(l).writePointer(u);let h=null;if(n!==void 0)h=new NativeCallback(n,"void",["pointer"]),c.add(a).writePointer(h);r(d)}function Bc(){let{vtableRedefineClasses:e,redefineClassesDoIt:t,redefineClassesDoItPrologue:n,redefineClassesDoItEpilogue:r,redefineClassesOnError:o,redefineClassesAllow:i,redefineClassesDispose0:s,redefineClassesDispose1:l,"VMThread::execute":a}=we(),c=e.add(2*J),d=15*J,p=Memory.dup(c,d),u=new NativeCallback(()=>{},"void",["pointer"]),h,_,f;for(let m=0;m!==d;m+=J){let y=p.add(m),E=y.readPointer();if(o!==void 0&&E.equals(o)||s!==void 0&&E.equals(s)||l!==void 0&&E.equals(l))y.writePointer(u);else if(E.equals(t))h=m;else if(E.equals(n))_=m,y.writePointer(i);else if(E.equals(r))f=m,y.writePointer(u)}return{execute:a,emptyCallback:u,vtable:p,vtableSize:d,doItOffset:h,prologueOffset:_,epilogueOffset:f}}function mo(e){return new fo(e)}function co(e,t,n){let{method:r,oldMethod:o}=e,i=we();if(e.methodsArray.add(e.methodIndex*J).writePointer(r),e.vtableIndex>=0)e.vtable.add(e.vtableIndex*J).writePointer(r);t.writePointer(r),o.accessFlagsPtr.writeU32((o.accessFlags|Nc|Lc)>>>0);let s=i["OopMapCache::flush_obsolete_entries"];if(s!==void 0){let{oopMapCache:_}=e;if(!_.isNull())s(_)}let l=i["VM_RedefineClasses::mark_dependent_code"],a=i["VM_RedefineClasses::flush_dependent_code"];if(l!==void 0)l(NULL,e.instanceKlass),a();else a(NULL,e.instanceKlass,n);let c=Memory.alloc(1);c.writeU8(1),i["ConstantPoolCache::adjust_method_entries"](e.cache,e.instanceKlass,c);let d=Memory.alloc(3*J),p=Memory.alloc(J);if(p.writePointer(i.doKlass),d.writePointer(p),d.add(J).writePointer(n),d.add(2*J).writePointer(n),i.redefineClass!==void 0)i.redefineClass.writePointer(e.instanceKlass);i["ClassLoaderDataGraph::classes_do"](d);let u=i["ResolvedMethodTable::adjust_method_entries"];if(u!==void 0)u(c);else{let{memberNames:_}=e;if(!_.isNull()){let f=i["MemberNameTable::adjust_method_entries"];if(f!==void 0)f(_,e.instanceKlass,c)}}let h=i["ClassLoaderDataGraph::clean_deallocate_lists"];if(h!==void 0)h(0)}function Jc(e,t,n){let r=we(),o=go(e);o.constPtr.writePointer(o.const);let i=(o.accessFlags|Ac|Mc|kc|xc)>>>0;if(o.accessFlagsPtr.writeU32(i),o.signatureHandler.writePointer(NULL),o.adapter.writePointer(NULL),o.i2iEntry.writePointer(NULL),r["Method::clear_code"](o.method),o.dataPtr.writePointer(NULL),o.countersPtr.writePointer(NULL),o.stackmapPtr.writePointer(NULL),r["Method::clear_native_function"](o.method),r["Method::set_native_function"](o.method,t,0),r["Method::restore_unshareable_info"](o.method,n),r.version>=17){let s=Memory.alloc(2*J);s.writePointer(o.method),s.add(J).writePointer(n),r["Method::link_method"](o.method,s,n)}return o}function go(e){let t=po(),n=e.add(t.method.constMethodOffset).readPointer(),r=n.add(t.constMethod.sizeOffset).readS32()*J,o=Memory.alloc(r+t.method.size);Memory.copy(o,n,r);let i=o.add(r);Memory.copy(i,e,t.method.size);let s=uo(i,o,r),l=uo(e,n,r);return s.oldMethod=l,s}function uo(e,t,n){let r=we(),o=po(),i=e.add(o.method.constMethodOffset),s=e.add(o.method.methodDataOffset),l=e.add(o.method.methodCountersOffset),a=e.add(o.method.accessFlagsOffset),c=a.readU32(),d=o.getAdapterPointer(e,t),p=e.add(o.method.i2iEntryOffset),u=e.add(o.method.signatureHandlerOffset),h=t.add(o.constMethod.constantPoolOffset).readPointer(),_=t.add(o.constMethod.stackmapDataOffset),f=h.add(o.constantPool.instanceKlassOffset).readPointer(),m=h.add(o.constantPool.cacheOffset).readPointer(),y=jc(),E=f.add(y.methodsOffset).readPointer(),k=E.readS32(),T=E.add(J),O=t.add(o.constMethod.methodIdnumOffset).readU16(),M=e.add(o.method.vtableIndexOffset),j=M.readS32(),v=f.add(y.vtableOffset),L=f.add(y.oopMapCacheOffset).readPointer(),S=r.version>=10?f.add(y.memberNamesOffset).readPointer():NULL;return{method:e,methodSize:o.method.size,const:t,constSize:n,constPtr:i,dataPtr:s,countersPtr:l,stackmapPtr:_,instanceKlass:f,methodsArray:T,methodsCount:k,methodIndex:O,vtableIndex:j,vtableIndexPtr:M,vtable:v,accessFlags:c,accessFlagsPtr:a,adapter:d,i2iEntry:p,signatureHandler:u,memberNames:S,cache:m,oopMapCache:L}}function Gc(e){let{oldMethod:t}=e;t.accessFlagsPtr.writeU32(t.accessFlags),t.vtableIndexPtr.writeS32(t.vtableIndex)}function $c(){let e=we(),{version:t}=e,n;if(t>=17)n="method:early";else if(t>=9&&t<=16)n="const-method";else n="method:late";let r=1,o=e["Method::size"](r)*J,i=J,s=2*J,l=3*J,a=4*J,c=n==="method:early"?J:0,d=a+c,p=d+4,u=p+4+8,h=u+J,_=c!==0?a:h,f=o-2*J,m=o-J,y=8,E=y+J,k=E+J,T=n==="const-method"?J:0,O=k+T,M=O+14,j=2*J,v=3*J;return{getAdapterPointer:T!==0?function(S,x){return x.add(k)}:function(S,x){return S.add(_)},method:{size:o,constMethodOffset:i,methodDataOffset:s,methodCountersOffset:l,accessFlagsOffset:d,vtableIndexOffset:p,i2iEntryOffset:u,nativeFunctionOffset:f,signatureHandlerOffset:m},constMethod:{constantPoolOffset:y,stackmapDataOffset:E,sizeOffset:O,methodIdnumOffset:M},constantPool:{cacheOffset:j,instanceKlassOffset:v}}}var Hc={x64:Wc};function Zc(){let{version:e,createNewDefaultVtableIndices:t}=we(),n=Hc[Process.arch];if(n===void 0)throw Error(`Missing vtable offset parser for ${Process.arch}`);let r=Ne(t,n,{limit:32});if(r===null)throw Error("Unable to deduce vtable offset");let o=e>=10&&e<=11||e>=15?17:18,i=r-7*J,s=r-17*J,l=r-o*J;return{vtableOffset:r,methodsOffset:i,memberNamesOffset:s,oopMapCacheOffset:l}}function Wc(e){if(e.mnemonic!=="mov")return null;let t=e.operands[0];if(t.type!=="mem")return null;let{value:n}=t;if(n.scale!==1)return null;let{disp:r}=n;if(r<256)return null;return r+16}var bo=B;try{lt()}catch(e){bo=we}var pt=bo;var qc=`#include <json-glib/json-glib.h>
#include <string.h>

#define kAccStatic 0x0008
#define kAccConstructor 0x00010000

typedef struct _Model Model;
typedef struct _EnumerateMethodsContext EnumerateMethodsContext;

typedef struct _JavaApi JavaApi;
typedef struct _JavaClassApi JavaClassApi;
typedef struct _JavaMethodApi JavaMethodApi;
typedef struct _JavaFieldApi JavaFieldApi;

typedef struct _JNIEnv JNIEnv;
typedef guint8 jboolean;
typedef gint32 jint;
typedef jint jsize;
typedef gpointer jobject;
typedef jobject jclass;
typedef jobject jstring;
typedef jobject jarray;
typedef jarray jobjectArray;
typedef gpointer jfieldID;
typedef gpointer jmethodID;

typedef struct _jvmtiEnv jvmtiEnv;
typedef enum
{
  JVMTI_ERROR_NONE = 0
} jvmtiError;

typedef struct _ArtApi ArtApi;
typedef guint32 ArtHeapReference;
typedef struct _ArtObject ArtObject;
typedef struct _ArtClass ArtClass;
typedef struct _ArtClassLinker ArtClassLinker;
typedef struct _ArtClassVisitor ArtClassVisitor;
typedef struct _ArtClassVisitorVTable ArtClassVisitorVTable;
typedef struct _ArtMethod ArtMethod;
typedef struct _ArtString ArtString;

typedef union _StdString StdString;
typedef struct _StdStringShort StdStringShort;
typedef struct _StdStringLong StdStringLong;

typedef void (* ArtVisitClassesFunc) (ArtClassLinker * linker, ArtClassVisitor * visitor);
typedef const char * (* ArtGetClassDescriptorFunc) (ArtClass * klass, StdString * storage);
typedef void (* ArtPrettyMethodFunc) (StdString * result, ArtMethod * method, jboolean with_signature);

struct _Model
{
  GHashTable * members;
};

struct _EnumerateMethodsContext
{
  GPatternSpec * class_query;
  GPatternSpec * method_query;
  jboolean include_signature;
  jboolean ignore_case;
  jboolean skip_system_classes;
  GHashTable * groups;
};

struct _JavaClassApi
{
  jmethodID get_declared_methods;
  jmethodID get_declared_fields;
};

struct _JavaMethodApi
{
  jmethodID get_name;
  jmethodID get_modifiers;
};

struct _JavaFieldApi
{
  jmethodID get_name;
  jmethodID get_modifiers;
};

struct _JavaApi
{
  jvmtiEnv * jvmti;
  JavaClassApi clazz;
  JavaMethodApi method;
  JavaFieldApi field;
};

struct _JNIEnv
{
  gpointer * functions;
};

struct _jvmtiEnv
{
  gpointer * functions;
};

struct _ArtApi
{
  gboolean available;

  guint class_offset_ifields;
  guint class_offset_methods;
  guint class_offset_sfields;
  guint class_offset_copied_methods_offset;

  guint method_size;
  guint method_offset_access_flags;

  guint field_size;
  guint field_offset_access_flags;

  guint alignment_padding;

  ArtClassLinker * linker;
  ArtVisitClassesFunc visit_classes;
  ArtGetClassDescriptorFunc get_class_descriptor;
  ArtPrettyMethodFunc pretty_method;

  void (* free) (gpointer mem);
};

struct _ArtObject
{
  ArtHeapReference klass;
  ArtHeapReference monitor;
};

struct _ArtClass
{
  ArtObject parent;

  ArtHeapReference class_loader;
};

struct _ArtClassVisitor
{
  ArtClassVisitorVTable * vtable;
  gpointer user_data;
};

struct _ArtClassVisitorVTable
{
  void (* reserved1) (ArtClassVisitor * self);
  void (* reserved2) (ArtClassVisitor * self);
  jboolean (* visit) (ArtClassVisitor * self, ArtClass * klass);
};

struct _ArtString
{
  ArtObject parent;

  gint32 count;
  guint32 hash_code;

  union
  {
    guint16 value[0];
    guint8 value_compressed[0];
  };
};

struct _StdStringShort
{
  guint8 size;
  gchar data[(3 * sizeof (gpointer)) - sizeof (guint8)];
};

struct _StdStringLong
{
  gsize capacity;
  gsize size;
  gchar * data;
};

union _StdString
{
  StdStringShort s;
  StdStringLong l;
};

static void model_add_method (Model * self, const gchar * name, jmethodID id, jint modifiers);
static void model_add_field (Model * self, const gchar * name, jfieldID id, jint modifiers);
static void model_free (Model * model);

static jboolean collect_matching_class_methods (ArtClassVisitor * self, ArtClass * klass);
static gchar * finalize_method_groups_to_json (GHashTable * groups);
static GPatternSpec * make_pattern_spec (const gchar * pattern, jboolean ignore_case);
static gchar * class_name_from_signature (const gchar * signature);
static gchar * format_method_signature (const gchar * name, const gchar * signature);
static void append_type (GString * output, const gchar ** type);

static gpointer read_art_array (gpointer object_base, guint field_offset, guint length_size, guint * length);

static void std_string_destroy (StdString * str);
static gchar * std_string_c_str (StdString * self);

extern GMutex lock;
extern GArray * models;
extern JavaApi java_api;
extern ArtApi art_api;

void
init (void)
{
  g_mutex_init (&lock);
  models = g_array_new (FALSE, FALSE, sizeof (Model *));
}

void
finalize (void)
{
  guint n, i;

  n = models->len;
  for (i = 0; i != n; i++)
  {
    Model * model = g_array_index (models, Model *, i);
    model_free (model);
  }

  g_array_unref (models);
  g_mutex_clear (&lock);
}

Model *
model_new (jclass class_handle,
           gpointer class_object,
           JNIEnv * env)
{
  Model * model;
  GHashTable * members;
  jvmtiEnv * jvmti = java_api.jvmti;
  gpointer * funcs = env->functions;
  jmethodID (* from_reflected_method) (JNIEnv *, jobject) = funcs[7];
  jfieldID (* from_reflected_field) (JNIEnv *, jobject) = funcs[8];
  jobject (* to_reflected_method) (JNIEnv *, jclass, jmethodID, jboolean) = funcs[9];
  jobject (* to_reflected_field) (JNIEnv *, jclass, jfieldID, jboolean) = funcs[12];
  void (* delete_local_ref) (JNIEnv *, jobject) = funcs[23];
  jobject (* call_object_method) (JNIEnv *, jobject, jmethodID, ...) = funcs[34];
  jint (* call_int_method) (JNIEnv *, jobject, jmethodID, ...) = funcs[49];
  const char * (* get_string_utf_chars) (JNIEnv *, jstring, jboolean *) = funcs[169];
  void (* release_string_utf_chars) (JNIEnv *, jstring, const char *) = funcs[170];
  jsize (* get_array_length) (JNIEnv *, jarray) = funcs[171];
  jobject (* get_object_array_element) (JNIEnv *, jobjectArray, jsize) = funcs[173];
  jsize n, i;

  model = g_new (Model, 1);

  members = g_hash_table_new_full (g_str_hash, g_str_equal, g_free, g_free);
  model->members = members;

  if (jvmti != NULL)
  {
    gpointer * jf = jvmti->functions - 1;
    jvmtiError (* deallocate) (jvmtiEnv *, void * mem) = jf[47];
    jvmtiError (* get_class_methods) (jvmtiEnv *, jclass, jint *, jmethodID **) = jf[52];
    jvmtiError (* get_class_fields) (jvmtiEnv *, jclass, jint *, jfieldID **) = jf[53];
    jvmtiError (* get_field_name) (jvmtiEnv *, jclass, jfieldID, char **, char **, char **) = jf[60];
    jvmtiError (* get_field_modifiers) (jvmtiEnv *, jclass, jfieldID, jint *) = jf[62];
    jvmtiError (* get_method_name) (jvmtiEnv *, jmethodID, char **, char **, char **) = jf[64];
    jvmtiError (* get_method_modifiers) (jvmtiEnv *, jmethodID, jint *) = jf[66];
    jint method_count;
    jmethodID * methods;
    jint field_count;
    jfieldID * fields;
    char * name;
    jint modifiers;

    get_class_methods (jvmti, class_handle, &method_count, &methods);
    for (i = 0; i != method_count; i++)
    {
      jmethodID method = methods[i];

      get_method_name (jvmti, method, &name, NULL, NULL);
      get_method_modifiers (jvmti, method, &modifiers);

      model_add_method (model, name, method, modifiers);

      deallocate (jvmti, name);
    }
    deallocate (jvmti, methods);

    get_class_fields (jvmti, class_handle, &field_count, &fields);
    for (i = 0; i != field_count; i++)
    {
      jfieldID field = fields[i];

      get_field_name (jvmti, class_handle, field, &name, NULL, NULL);
      get_field_modifiers (jvmti, class_handle, field, &modifiers);

      model_add_field (model, name, field, modifiers);

      deallocate (jvmti, name);
    }
    deallocate (jvmti, fields);
  }
  else if (art_api.available)
  {
    gpointer elements;
    guint n, i;
    const guint field_arrays[] = {
      art_api.class_offset_ifields,
      art_api.class_offset_sfields
    };
    guint field_array_cursor;
    gboolean merged_fields = art_api.class_offset_sfields == 0;

    elements = read_art_array (class_object, art_api.class_offset_methods, sizeof (gsize), NULL);
    n = *(guint16 *) (class_object + art_api.class_offset_copied_methods_offset);
    for (i = 0; i != n; i++)
    {
      jmethodID id;
      guint32 access_flags;
      jboolean is_static;
      jobject method, name;
      const char * name_str;
      jint modifiers;

      id = elements + (i * art_api.method_size);

      access_flags = *(guint32 *) (id + art_api.method_offset_access_flags);
      if ((access_flags & kAccConstructor) != 0)
        continue;
      is_static = (access_flags & kAccStatic) != 0;
      method = to_reflected_method (env, class_handle, id, is_static);
      name = call_object_method (env, method, java_api.method.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      modifiers = access_flags & 0xffff;

      model_add_method (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, method);
    }

    for (field_array_cursor = 0; field_array_cursor != G_N_ELEMENTS (field_arrays); field_array_cursor++)
    {
      jboolean is_static;

      if (field_arrays[field_array_cursor] == 0)
        continue;

      if (!merged_fields)
        is_static = field_array_cursor == 1;

      elements = read_art_array (class_object, field_arrays[field_array_cursor], sizeof (guint32), &n);
      for (i = 0; i != n; i++)
      {
        jfieldID id;
        guint32 access_flags;
        jobject field, name;
        const char * name_str;
        jint modifiers;

        id = elements + (i * art_api.field_size);

        access_flags = *(guint32 *) (id + art_api.field_offset_access_flags);
        if (merged_fields)
          is_static = (access_flags & kAccStatic) != 0;
        field = to_reflected_field (env, class_handle, id, is_static);
        name = call_object_method (env, field, java_api.field.get_name);
        name_str = get_string_utf_chars (env, name, NULL);
        modifiers = access_flags & 0xffff;

        model_add_field (model, name_str, id, modifiers);

        release_string_utf_chars (env, name, name_str);
        delete_local_ref (env, name);
        delete_local_ref (env, field);
      }
    }
  }
  else
  {
    jobject elements;

    elements = call_object_method (env, class_handle, java_api.clazz.get_declared_methods);
    n = get_array_length (env, elements);
    for (i = 0; i != n; i++)
    {
      jobject method, name;
      const char * name_str;
      jmethodID id;
      jint modifiers;

      method = get_object_array_element (env, elements, i);
      name = call_object_method (env, method, java_api.method.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      id = from_reflected_method (env, method);
      modifiers = call_int_method (env, method, java_api.method.get_modifiers);

      model_add_method (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, method);
    }
    delete_local_ref (env, elements);

    elements = call_object_method (env, class_handle, java_api.clazz.get_declared_fields);
    n = get_array_length (env, elements);
    for (i = 0; i != n; i++)
    {
      jobject field, name;
      const char * name_str;
      jfieldID id;
      jint modifiers;

      field = get_object_array_element (env, elements, i);
      name = call_object_method (env, field, java_api.field.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      id = from_reflected_field (env, field);
      modifiers = call_int_method (env, field, java_api.field.get_modifiers);

      model_add_field (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, field);
    }
    delete_local_ref (env, elements);
  }

  g_mutex_lock (&lock);
  g_array_append_val (models, model);
  g_mutex_unlock (&lock);

  return model;
}

static void
model_add_method (Model * self,
                  const gchar * name,
                  jmethodID id,
                  jint modifiers)
{
  GHashTable * members = self->members;
  gchar * key, type;
  const gchar * value;

  if (name[0] == '$')
    key = g_strdup_printf ("_%s", name);
  else
    key = g_strdup (name);

  type = (modifiers & kAccStatic) != 0 ? 's' : 'i';

  value = g_hash_table_lookup (members, key);
  if (value == NULL)
    g_hash_table_insert (members, key, g_strdup_printf ("m:%c0x%zx", type, id));
  else
    g_hash_table_insert (members, key, g_strdup_printf ("%s:%c0x%zx", value, type, id));
}

static void
model_add_field (Model * self,
                 const gchar * name,
                 jfieldID id,
                 jint modifiers)
{
  GHashTable * members = self->members;
  gchar * key, type;

  if (name[0] == '$')
    key = g_strdup_printf ("_%s", name);
  else
    key = g_strdup (name);
  while (g_hash_table_contains (members, key))
  {
    gchar * new_key = g_strdup_printf ("_%s", key);
    g_free (key);
    key = new_key;
  }

  type = (modifiers & kAccStatic) != 0 ? 's' : 'i';

  g_hash_table_insert (members, key, g_strdup_printf ("f:%c0x%zx", type, id));
}

static void
model_free (Model * model)
{
  g_hash_table_unref (model->members);

  g_free (model);
}

gboolean
model_has (Model * self,
           const gchar * member)
{
  return g_hash_table_contains (self->members, member);
}

const gchar *
model_find (Model * self,
            const gchar * member)
{
  return g_hash_table_lookup (self->members, member);
}

gchar *
model_list (Model * self)
{
  GString * result;
  GHashTableIter iter;
  guint i;
  const gchar * name;

  result = g_string_sized_new (128);

  g_string_append_c (result, '[');

  g_hash_table_iter_init (&iter, self->members);
  for (i = 0; g_hash_table_iter_next (&iter, (gpointer *) &name, NULL); i++)
  {
    if (i > 0)
      g_string_append_c (result, ',');

    g_string_append_c (result, '"');
    g_string_append (result, name);
    g_string_append_c (result, '"');
  }

  g_string_append_c (result, ']');

  return g_string_free (result, FALSE);
}

gchar *
enumerate_methods_art (const gchar * class_query,
                       const gchar * method_query,
                       jboolean include_signature,
                       jboolean ignore_case,
                       jboolean skip_system_classes)
{
  gchar * result;
  EnumerateMethodsContext ctx;
  ArtClassVisitor visitor;
  ArtClassVisitorVTable visitor_vtable = { NULL, };

  ctx.class_query = make_pattern_spec (class_query, ignore_case);
  ctx.method_query = make_pattern_spec (method_query, ignore_case);
  ctx.include_signature = include_signature;
  ctx.ignore_case = ignore_case;
  ctx.skip_system_classes = skip_system_classes;
  ctx.groups = g_hash_table_new_full (NULL, NULL, NULL, NULL);

  visitor.vtable = &visitor_vtable;
  visitor.user_data = &ctx;

  visitor_vtable.visit = collect_matching_class_methods;

  art_api.visit_classes (art_api.linker, &visitor);

  result = finalize_method_groups_to_json (ctx.groups);

  g_hash_table_unref (ctx.groups);
  g_pattern_spec_free (ctx.method_query);
  g_pattern_spec_free (ctx.class_query);

  return result;
}

static jboolean
collect_matching_class_methods (ArtClassVisitor * self,
                                ArtClass * klass)
{
  EnumerateMethodsContext * ctx = self->user_data;
  const char * descriptor;
  StdString descriptor_storage = { 0, };
  gchar * class_name = NULL;
  gchar * class_name_copy = NULL;
  const gchar * normalized_class_name;
  JsonBuilder * group;
  size_t class_name_length;
  GHashTable * seen_method_names;
  gpointer elements;
  guint n, i;

  if (ctx->skip_system_classes && klass->class_loader == 0)
    goto skip_class;

  descriptor = art_api.get_class_descriptor (klass, &descriptor_storage);
  if (descriptor[0] != 'L')
    goto skip_class;

  class_name = class_name_from_signature (descriptor);

  if (ctx->ignore_case)
  {
    class_name_copy = g_utf8_strdown (class_name, -1);
    normalized_class_name = class_name_copy;
  }
  else
  {
    normalized_class_name = class_name;
  }

  if (!g_pattern_match_string (ctx->class_query, normalized_class_name))
    goto skip_class;

  group = NULL;
  class_name_length = strlen (class_name);
  seen_method_names = ctx->include_signature ? NULL : g_hash_table_new_full (g_str_hash, g_str_equal, g_free, NULL);

  elements = read_art_array (klass, art_api.class_offset_methods, sizeof (gsize), NULL);
  n = *(guint16 *) ((gpointer) klass + art_api.class_offset_copied_methods_offset);
  for (i = 0; i != n; i++)
  {
    ArtMethod * method;
    guint32 access_flags;
    jboolean is_constructor;
    StdString method_name = { 0, };
    const gchar * bare_method_name;
    gchar * bare_method_name_copy = NULL;
    const gchar * normalized_method_name;
    gchar * normalized_method_name_copy = NULL;

    method = elements + (i * art_api.method_size);

    access_flags = *(guint32 *) ((gpointer) method + art_api.method_offset_access_flags);
    is_constructor = (access_flags & kAccConstructor) != 0;

    art_api.pretty_method (&method_name, method, ctx->include_signature);
    bare_method_name = std_string_c_str (&method_name);
    if (ctx->include_signature)
    {
      const gchar * return_type_end, * name_begin;
      GString * name;

      return_type_end = strchr (bare_method_name, ' ');
      name_begin = return_type_end + 1 + class_name_length + 1;
      if (is_constructor && g_str_has_prefix (name_begin, "<clinit>"))
        goto skip_method;

      name = g_string_sized_new (64);

      if (is_constructor)
      {
        g_string_append (name, "$init");
        g_string_append (name, strchr (name_begin, '>') + 1);
      }
      else
      {
        g_string_append (name, name_begin);
      }
      g_string_append (name, ": ");
      g_string_append_len (name, bare_method_name, return_type_end - bare_method_name);

      bare_method_name_copy = g_string_free (name, FALSE);
      bare_method_name = bare_method_name_copy;
    }
    else
    {
      const gchar * name_begin;

      name_begin = bare_method_name + class_name_length + 1;
      if (is_constructor && strcmp (name_begin, "<clinit>") == 0)
        goto skip_method;

      if (is_constructor)
        bare_method_name = "$init";
      else
        bare_method_name += class_name_length + 1;
    }

    if (seen_method_names != NULL && g_hash_table_contains (seen_method_names, bare_method_name))
      goto skip_method;

    if (ctx->ignore_case)
    {
      normalized_method_name_copy = g_utf8_strdown (bare_method_name, -1);
      normalized_method_name = normalized_method_name_copy;
    }
    else
    {
      normalized_method_name = bare_method_name;
    }

    if (!g_pattern_match_string (ctx->method_query, normalized_method_name))
      goto skip_method;

    if (group == NULL)
    {
      group = g_hash_table_lookup (ctx->groups, GUINT_TO_POINTER (klass->class_loader));
      if (group == NULL)
      {
        group = json_builder_new_immutable ();
        g_hash_table_insert (ctx->groups, GUINT_TO_POINTER (klass->class_loader), group);

        json_builder_begin_object (group);

        json_builder_set_member_name (group, "loader");
        json_builder_add_int_value (group, klass->class_loader);

        json_builder_set_member_name (group, "classes");
        json_builder_begin_array (group);
      }

      json_builder_begin_object (group);

      json_builder_set_member_name (group, "name");
      json_builder_add_string_value (group, class_name);

      json_builder_set_member_name (group, "methods");
      json_builder_begin_array (group);
    }

    json_builder_add_string_value (group, bare_method_name);

    if (seen_method_names != NULL)
      g_hash_table_add (seen_method_names, g_strdup (bare_method_name));

skip_method:
    g_free (normalized_method_name_copy);
    g_free (bare_method_name_copy);
    std_string_destroy (&method_name);
  }

  if (seen_method_names != NULL)
    g_hash_table_unref (seen_method_names);

  if (group == NULL)
    goto skip_class;

  json_builder_end_array (group);
  json_builder_end_object (group);

skip_class:
  g_free (class_name_copy);
  g_free (class_name);
  std_string_destroy (&descriptor_storage);

  return TRUE;
}

gchar *
enumerate_methods_jvm (const gchar * class_query,
                       const gchar * method_query,
                       jboolean include_signature,
                       jboolean ignore_case,
                       jboolean skip_system_classes,
                       JNIEnv * env)
{
  gchar * result;
  GPatternSpec * class_pattern, * method_pattern;
  GHashTable * groups;
  gpointer * ef = env->functions;
  jobject (* new_global_ref) (JNIEnv *, jobject) = ef[21];
  void (* delete_local_ref) (JNIEnv *, jobject) = ef[23];
  jboolean (* is_same_object) (JNIEnv *, jobject, jobject) = ef[24];
  jvmtiEnv * jvmti = java_api.jvmti;
  gpointer * jf = jvmti->functions - 1;
  jvmtiError (* deallocate) (jvmtiEnv *, void * mem) = jf[47];
  jvmtiError (* get_class_signature) (jvmtiEnv *, jclass, char **, char **) = jf[48];
  jvmtiError (* get_class_methods) (jvmtiEnv *, jclass, jint *, jmethodID **) = jf[52];
  jvmtiError (* get_class_loader) (jvmtiEnv *, jclass, jobject *) = jf[57];
  jvmtiError (* get_method_name) (jvmtiEnv *, jmethodID, char **, char **, char **) = jf[64];
  jvmtiError (* get_loaded_classes) (jvmtiEnv *, jint *, jclass **) = jf[78];
  jint class_count, class_index;
  jclass * classes;

  class_pattern = make_pattern_spec (class_query, ignore_case);
  method_pattern = make_pattern_spec (method_query, ignore_case);
  groups = g_hash_table_new_full (NULL, NULL, NULL, NULL);

  if (get_loaded_classes (jvmti, &class_count, &classes) != JVMTI_ERROR_NONE)
    goto emit_results;

  for (class_index = 0; class_index != class_count; class_index++)
  {
    jclass klass = classes[class_index];
    jobject loader = NULL;
    gboolean have_loader = FALSE;
    char * signature = NULL;
    gchar * class_name = NULL;
    gchar * class_name_copy = NULL;
    const gchar * normalized_class_name;
    jint method_count, method_index;
    jmethodID * methods = NULL;
    JsonBuilder * group = NULL;
    GHashTable * seen_method_names = NULL;

    if (skip_system_classes)
    {
      if (get_class_loader (jvmti, klass, &loader) != JVMTI_ERROR_NONE)
        goto skip_class;
      have_loader = TRUE;

      if (loader == NULL)
        goto skip_class;
    }

    if (get_class_signature (jvmti, klass, &signature, NULL) != JVMTI_ERROR_NONE)
      goto skip_class;

    class_name = class_name_from_signature (signature);

    if (ignore_case)
    {
      class_name_copy = g_utf8_strdown (class_name, -1);
      normalized_class_name = class_name_copy;
    }
    else
    {
      normalized_class_name = class_name;
    }

    if (!g_pattern_match_string (class_pattern, normalized_class_name))
      goto skip_class;

    if (get_class_methods (jvmti, klass, &method_count, &methods) != JVMTI_ERROR_NONE)
      goto skip_class;

    if (!include_signature)
      seen_method_names = g_hash_table_new_full (g_str_hash, g_str_equal, g_free, NULL);

    for (method_index = 0; method_index != method_count; method_index++)
    {
      jmethodID method = methods[method_index];
      const gchar * method_name;
      char * method_name_value = NULL;
      char * method_signature_value = NULL;
      gchar * method_name_copy = NULL;
      const gchar * normalized_method_name;
      gchar * normalized_method_name_copy = NULL;

      if (get_method_name (jvmti, method, &method_name_value, include_signature ? &method_signature_value : NULL, NULL) != JVMTI_ERROR_NONE)
        goto skip_method;
      method_name = method_name_value;

      if (method_name[0] == '<')
      {
        if (strcmp (method_name, "<init>") == 0)
          method_name = "$init";
        else if (strcmp (method_name, "<clinit>") == 0)
          goto skip_method;
      }

      if (include_signature)
      {
        method_name_copy = format_method_signature (method_name, method_signature_value);
        method_name = method_name_copy;
      }

      if (seen_method_names != NULL && g_hash_table_contains (seen_method_names, method_name))
        goto skip_method;

      if (ignore_case)
      {
        normalized_method_name_copy = g_utf8_strdown (method_name, -1);
        normalized_method_name = normalized_method_name_copy;
      }
      else
      {
        normalized_method_name = method_name;
      }

      if (!g_pattern_match_string (method_pattern, normalized_method_name))
        goto skip_method;

      if (group == NULL)
      {
        if (!have_loader && get_class_loader (jvmti, klass, &loader) != JVMTI_ERROR_NONE)
          goto skip_method;

        if (loader == NULL)
        {
          group = g_hash_table_lookup (groups, NULL);
        }
        else
        {
          GHashTableIter iter;
          jobject cur_loader;
          JsonBuilder * cur_group;

          g_hash_table_iter_init (&iter, groups);
          while (g_hash_table_iter_next (&iter, (gpointer *) &cur_loader, (gpointer *) &cur_group))
          {
            if (cur_loader != NULL && is_same_object (env, cur_loader, loader))
            {
              group = cur_group;
              break;
            }
          }
        }

        if (group == NULL)
        {
          jobject l;
          gchar * str;

          l = (loader != NULL) ? new_global_ref (env, loader) : NULL;

          group = json_builder_new_immutable ();
          g_hash_table_insert (groups, l, group);

          json_builder_begin_object (group);

          json_builder_set_member_name (group, "loader");
          str = g_strdup_printf ("0x%" G_GSIZE_MODIFIER "x", GPOINTER_TO_SIZE (l));
          json_builder_add_string_value (group, str);
          g_free (str);

          json_builder_set_member_name (group, "classes");
          json_builder_begin_array (group);
        }

        json_builder_begin_object (group);

        json_builder_set_member_name (group, "name");
        json_builder_add_string_value (group, class_name);

        json_builder_set_member_name (group, "methods");
        json_builder_begin_array (group);
      }

      json_builder_add_string_value (group, method_name);

      if (seen_method_names != NULL)
        g_hash_table_add (seen_method_names, g_strdup (method_name));

skip_method:
      g_free (normalized_method_name_copy);
      g_free (method_name_copy);
      deallocate (jvmti, method_signature_value);
      deallocate (jvmti, method_name_value);
    }

skip_class:
    if (group != NULL)
    {
      json_builder_end_array (group);
      json_builder_end_object (group);
    }

    if (seen_method_names != NULL)
      g_hash_table_unref (seen_method_names);

    deallocate (jvmti, methods);

    g_free (class_name_copy);
    g_free (class_name);
    deallocate (jvmti, signature);

    if (loader != NULL)
      delete_local_ref (env, loader);

    delete_local_ref (env, klass);
  }

  deallocate (jvmti, classes);

emit_results:
  result = finalize_method_groups_to_json (groups);

  g_hash_table_unref (groups);
  g_pattern_spec_free (method_pattern);
  g_pattern_spec_free (class_pattern);

  return result;
}

static gchar *
finalize_method_groups_to_json (GHashTable * groups)
{
  GString * result;
  GHashTableIter iter;
  guint i;
  JsonBuilder * group;

  result = g_string_sized_new (1024);

  g_string_append_c (result, '[');

  g_hash_table_iter_init (&iter, groups);
  for (i = 0; g_hash_table_iter_next (&iter, NULL, (gpointer *) &group); i++)
  {
    JsonNode * root;
    gchar * json;

    if (i > 0)
      g_string_append_c (result, ',');

    json_builder_end_array (group);
    json_builder_end_object (group);

    root = json_builder_get_root (group);
    json = json_to_string (root, FALSE);
    g_string_append (result, json);
    g_free (json);
    json_node_unref (root);

    g_object_unref (group);
  }

  g_string_append_c (result, ']');

  return g_string_free (result, FALSE);
}

static GPatternSpec *
make_pattern_spec (const gchar * pattern,
                   jboolean ignore_case)
{
  GPatternSpec * spec;

  if (ignore_case)
  {
    gchar * str = g_utf8_strdown (pattern, -1);
    spec = g_pattern_spec_new (str);
    g_free (str);
  }
  else
  {
    spec = g_pattern_spec_new (pattern);
  }

  return spec;
}

static gchar *
class_name_from_signature (const gchar * descriptor)
{
  gchar * result, * c;

  result = g_strdup (descriptor + 1);

  for (c = result; *c != '\\0'; c++)
  {
    if (*c == '/')
      *c = '.';
  }

  c[-1] = '\\0';

  return result;
}

static gchar *
format_method_signature (const gchar * name,
                         const gchar * signature)
{
  GString * sig;
  const gchar * cursor;
  gint arg_index;

  sig = g_string_sized_new (128);

  g_string_append (sig, name);

  cursor = signature;
  arg_index = -1;
  while (TRUE)
  {
    const gchar c = *cursor;

    if (c == '(')
    {
      g_string_append_c (sig, c);
      cursor++;
      arg_index = 0;
    }
    else if (c == ')')
    {
      g_string_append_c (sig, c);
      cursor++;
      break;
    }
    else
    {
      if (arg_index >= 1)
        g_string_append (sig, ", ");

      append_type (sig, &cursor);

      if (arg_index != -1)
        arg_index++;
    }
  }

  g_string_append (sig, ": ");
  append_type (sig, &cursor);

  return g_string_free (sig, FALSE);
}

static void
append_type (GString * output,
             const gchar ** type)
{
  const gchar * cursor = *type;

  switch (*cursor)
  {
    case 'Z':
      g_string_append (output, "boolean");
      cursor++;
      break;
    case 'B':
      g_string_append (output, "byte");
      cursor++;
      break;
    case 'C':
      g_string_append (output, "char");
      cursor++;
      break;
    case 'S':
      g_string_append (output, "short");
      cursor++;
      break;
    case 'I':
      g_string_append (output, "int");
      cursor++;
      break;
    case 'J':
      g_string_append (output, "long");
      cursor++;
      break;
    case 'F':
      g_string_append (output, "float");
      cursor++;
      break;
    case 'D':
      g_string_append (output, "double");
      cursor++;
      break;
    case 'V':
      g_string_append (output, "void");
      cursor++;
      break;
    case 'L':
    {
      gchar ch;

      cursor++;
      for (; (ch = *cursor) != ';'; cursor++)
      {
        g_string_append_c (output, (ch != '/') ? ch : '.');
      }
      cursor++;

      break;
    }
    case '[':
      *type = cursor + 1;
      append_type (output, type);
      g_string_append (output, "[]");
      return;
    default:
      g_string_append (output, "BUG");
      cursor++;
  }

  *type = cursor;
}

void
dealloc (gpointer mem)
{
  g_free (mem);
}

static gpointer
read_art_array (gpointer object_base,
                guint field_offset,
                guint length_size,
                guint * length)
{
  gpointer result, header;
  guint n;

  header = GSIZE_TO_POINTER (*(guint64 *) (object_base + field_offset));
  if (header != NULL)
  {
    result = header + length_size;
    if (length_size == sizeof (guint32))
      n = *(guint32 *) header;
    else
      n = *(guint64 *) header;
  }
  else
  {
    result = NULL;
    n = 0;
  }

  if (length != NULL)
    *length = n;

  return result;
}

static void
std_string_destroy (StdString * str)
{
  if ((str->l.capacity & 1) != 0)
    art_api.free (str->l.data);
}

static gchar *
std_string_c_str (StdString * self)
{
  if ((self->l.capacity & 1) != 0)
    return self->l.data;

  return self->s.data;
}
`,Kc=/(.+)!([^/]+)\/?([isu]+)?/,be=null,Eo=null;class Ve{static build(e,t){return yo(t),Eo(e,t,(n)=>new Ve(be.new(e,n,t)))}static enumerateMethods(e,t,n){yo(n);let r=e.match(Kc);if(r===null)throw Error("Invalid query; format is: class!method -- see documentation of Java.enumerateMethods(query) for details");let o=Memory.allocUtf8String(r[1]),i=Memory.allocUtf8String(r[2]),s=!1,l=!1,a=!1,c=r[3];if(c!==void 0)s=c.indexOf("s")!==-1,l=c.indexOf("i")!==-1,a=c.indexOf("u")!==-1;let d;if(t.jvmti!==null){let p=be.enumerateMethodsJvm(o,i,Ke(s),Ke(l),Ke(a),n);try{d=JSON.parse(p.readUtf8String()).map((u)=>{let h=ptr(u.loader);return u.loader=!h.isNull()?h:null,u})}finally{be.dealloc(p)}}else he(n.vm,n,(p)=>{let u=be.enumerateMethodsArt(o,i,Ke(s),Ke(l),Ke(a));try{let h=t["art::JavaVMExt::AddGlobalRef"],{vm:_}=t;d=JSON.parse(u.readUtf8String()).map((f)=>{let m=f.loader;return f.loader=m!==0?h(_,p,ptr(m)):null,f})}finally{be.dealloc(u)}});return d}constructor(e){this.handle=e}has(e){return be.has(this.handle,Memory.allocUtf8String(e))!==0}find(e){return be.find(this.handle,Memory.allocUtf8String(e)).readUtf8String()}list(){let e=be.list(this.handle);try{return JSON.parse(e.readUtf8String())}finally{be.dealloc(e)}}}function yo(e){if(be===null)be=Qc(e),Eo=Xc(be,e.vm)}function Qc(e){let t=pt(),{jvmti:n=null}=t,{pointerSize:r}=Process,o=8,i=r,s=7*r,l=40+5*r,a=8+i+s+l,d=Memory.alloc(a),p=d.add(8),u=p.add(i),{getDeclaredMethods:h,getDeclaredFields:_}=e.javaLangClass(),f=e.javaLangReflectMethod(),m=e.javaLangReflectField(),y=u;[n!==null?n:NULL,h,_,f.getName,f.getModifiers,m.getName,m.getModifiers].forEach((j)=>{y=y.writePointer(j).add(r)});let E=u.add(s),{vm:k}=e;if(t.flavor==="art"){let j;if(n!==null)j=[0,0,0,0];else{let x=In(k).offset;j=[x.ifields,x.methods,x.sfields,x.copiedMethodsOffset]}let v=pe(k),L=Mt(k),S=E;[1,...j,v.size,v.offset.accessFlags,L.size,L.offset.accessFlags,4294967295].forEach((x)=>{S=S.writeUInt(x).add(4)}),[t.artClassLinker.address,t["art::ClassLinker::VisitClasses"],t["art::mirror::Class::GetDescriptor"],t["art::ArtMethod::PrettyMethod"],Process.getModuleByName("libc.so").getExportByName("free")].forEach((x,I)=>{if(x===void 0)x=NULL;S=S.writePointer(x).add(r)})}let T=new CModule(qc,{lock:d,models:p,java_api:u,art_api:E}),O={exceptions:"propagate"},M={exceptions:"propagate",scheduling:"exclusive"};return{handle:T,new:new NativeFunction(T.model_new,"pointer",["pointer","pointer","pointer"],O),has:new NativeFunction(T.model_has,"bool",["pointer","pointer"],M),find:new NativeFunction(T.model_find,"pointer",["pointer","pointer"],M),list:new NativeFunction(T.model_list,"pointer",["pointer"],M),enumerateMethodsArt:new NativeFunction(T.enumerate_methods_art,"pointer",["pointer","pointer","bool","bool","bool"],O),enumerateMethodsJvm:new NativeFunction(T.enumerate_methods_jvm,"pointer",["pointer","pointer","bool","bool","bool","pointer"],O),dealloc:new NativeFunction(T.dealloc,"void",["pointer"],M)}}function Xc(e,t){let n=pt();if(n.flavor!=="art")return Yc;let r=n["art::JavaVMExt::DecodeGlobal"];return function(o,i,s){let l;return he(t,i,(a)=>{let c=r(t,a,o);l=s(c)}),l}}function Yc(e,t,n){return n(NULL)}function Ke(e){return e?1:0}class Rt{constructor(e,t){this.items=new Map,this.capacity=e,this.destroy=t}dispose(e){let{items:t,destroy:n}=this;t.forEach((r)=>{n(r,e)}),t.clear()}get(e){let{items:t}=this,n=t.get(e);if(n!==void 0)t.delete(e),t.set(e,n);return n}set(e,t,n){let{items:r}=this,o=r.get(e);if(o!==void 0)r.delete(e),this.destroy(o,n);else if(r.size===this.capacity){let i=r.keys().next().value,s=r.get(i);r.delete(i),this.destroy(s,n)}r.set(e,t)}}var Ie=[],ye=[],Gn="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";for(Be=0,vo=Gn.length;Be<vo;++Be)Ie[Be]=Gn[Be],ye[Gn.charCodeAt(Be)]=Be;var Be,vo;ye[45]=62;ye[95]=63;function ed(e){var t=e.length;if(t%4>0)throw Error("Invalid string. Length must be a multiple of 4");var n=e.indexOf("=");if(n===-1)n=t;var r=n===t?0:4-n%4;return[n,r]}function td(e,t){return(e+t)*3/4-t}function nd(e){var t,n=ed(e),r=n[0],o=n[1],i=new Uint8Array(td(r,o)),s=0,l=o>0?r-4:r,a;for(a=0;a<l;a+=4)t=ye[e.charCodeAt(a)]<<18|ye[e.charCodeAt(a+1)]<<12|ye[e.charCodeAt(a+2)]<<6|ye[e.charCodeAt(a+3)],i[s++]=t>>16&255,i[s++]=t>>8&255,i[s++]=t&255;if(o===2)t=ye[e.charCodeAt(a)]<<2|ye[e.charCodeAt(a+1)]>>4,i[s++]=t&255;if(o===1)t=ye[e.charCodeAt(a)]<<10|ye[e.charCodeAt(a+1)]<<4|ye[e.charCodeAt(a+2)]>>2,i[s++]=t>>8&255,i[s++]=t&255;return i}function rd(e){return Ie[e>>18&63]+Ie[e>>12&63]+Ie[e>>6&63]+Ie[e&63]}function od(e,t,n){var r,o=[];for(var i=t;i<n;i+=3)r=(e[i]<<16&16711680)+(e[i+1]<<8&65280)+(e[i+2]&255),o.push(rd(r));return o.join("")}function So(e){var t,n=e.length,r=n%3,o=[],i=16383;for(var s=0,l=n-r;s<l;s+=i)o.push(od(e,s,s+i>l?l:s+i));if(r===1)t=e[n-1],o.push(Ie[t>>2]+Ie[t<<4&63]+"==");else if(r===2)t=(e[n-2]<<8)+e[n-1],o.push(Ie[t>>10]+Ie[t>>4&63]+Ie[t<<2&63]+"=");return o.join("")}function Pt(e,t,n,r,o){var i,s,l=o*8-r-1,a=(1<<l)-1,c=a>>1,d=-7,p=n?o-1:0,u=n?-1:1,h=e[t+p];p+=u,i=h&(1<<-d)-1,h>>=-d,d+=l;for(;d>0;i=i*256+e[t+p],p+=u,d-=8);s=i&(1<<-d)-1,i>>=-d,d+=r;for(;d>0;s=s*256+e[t+p],p+=u,d-=8);if(i===0)i=1-c;else if(i===a)return s?NaN:(h?-1:1)*(1/0);else s=s+Math.pow(2,r),i=i-c;return(h?-1:1)*s*Math.pow(2,i-r)}function Ao(e,t,n,r,o,i){var s,l,a,c=i*8-o-1,d=(1<<c)-1,p=d>>1,u=o===23?Math.pow(2,-24)-Math.pow(2,-77):0,h=r?0:i-1,_=r?1:-1,f=t<0||t===0&&1/t<0?1:0;if(t=Math.abs(t),isNaN(t)||t===1/0)l=isNaN(t)?1:0,s=d;else{if(s=Math.floor(Math.log(t)/Math.LN2),t*(a=Math.pow(2,-s))<1)s--,a*=2;if(s+p>=1)t+=u/a;else t+=u*Math.pow(2,1-p);if(t*a>=2)s++,a/=2;if(s+p>=d)l=0,s=d;else if(s+p>=1)l=(t*a-1)*Math.pow(2,o),s=s+p;else l=t*Math.pow(2,p-1)*Math.pow(2,o),s=0}for(;o>=8;e[n+h]=l&255,h+=_,l/=256,o-=8);s=s<<o|l,c+=o;for(;c>0;e[n+h]=s&255,h+=_,s/=256,c-=8);e[n+h-_]|=f*128}var wo=typeof Symbol==="function"&&typeof Symbol.for==="function"?Symbol.for("nodejs.util.inspect.custom"):null,id=50,$n=2147483647;var{btoa:Ip,atob:Cp,File:Tp,Blob:Ap}=globalThis;function Le(e){if(e>$n)throw RangeError('The value "'+e+'" is invalid for option "size"');let t=new Uint8Array(e);return Object.setPrototypeOf(t,g.prototype),t}function Kn(e,t,n){return class extends n{constructor(){super();Object.defineProperty(this,"message",{value:t.apply(this,arguments),writable:!0,configurable:!0}),this.name=`${this.name} [${e}]`,this.stack,delete this.name}get code(){return e}set code(r){Object.defineProperty(this,"code",{configurable:!0,enumerable:!0,value:r,writable:!0})}toString(){return`${this.name} [${e}]: ${this.message}`}}}var sd=Kn("ERR_BUFFER_OUT_OF_BOUNDS",function(e){if(e)return`${e} is outside of buffer bounds`;return"Attempt to access memory outside buffer bounds"},RangeError),ad=Kn("ERR_INVALID_ARG_TYPE",function(e,t){return`The "${e}" argument must be of type number. Received type ${typeof t}`},TypeError),Hn=Kn("ERR_OUT_OF_RANGE",function(e,t,n){let r=`The value of "${e}" is out of range.`,o=n;if(Number.isInteger(n)&&Math.abs(n)>4294967296)o=To(String(n));else if(typeof n==="bigint"){if(o=String(n),n>BigInt(2)**BigInt(32)||n<-(BigInt(2)**BigInt(32)))o=To(o);o+="n"}return r+=` It must be ${t}. Received ${o}`,r},RangeError);function g(e,t,n){if(typeof e==="number"){if(typeof t==="string")throw TypeError('The "string" argument must be of type string. Received type number');return Qn(e)}return No(e,t,n)}Object.defineProperty(g.prototype,"parent",{enumerable:!0,get:function(){if(!g.isBuffer(this))return;return this.buffer}});Object.defineProperty(g.prototype,"offset",{enumerable:!0,get:function(){if(!g.isBuffer(this))return;return this.byteOffset}});g.poolSize=8192;function No(e,t,n){if(typeof e==="string")return cd(e,t);if(ArrayBuffer.isView(e))return dd(e);if(e==null)throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof e);if(Ce(e,ArrayBuffer)||e&&Ce(e.buffer,ArrayBuffer))return Wn(e,t,n);if(typeof SharedArrayBuffer<"u"&&(Ce(e,SharedArrayBuffer)||e&&Ce(e.buffer,SharedArrayBuffer)))return Wn(e,t,n);if(typeof e==="number")throw TypeError('The "value" argument must not be of type number. Received type number');let r=e.valueOf&&e.valueOf();if(r!=null&&r!==e)return g.from(r,t,n);let o=ud(e);if(o)return o;if(typeof Symbol<"u"&&Symbol.toPrimitive!=null&&typeof e[Symbol.toPrimitive]==="function")return g.from(e[Symbol.toPrimitive]("string"),t,n);throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof e)}g.from=function(e,t,n){return No(e,t,n)};Object.setPrototypeOf(g.prototype,Uint8Array.prototype);Object.setPrototypeOf(g,Uint8Array);function Lo(e){if(typeof e!=="number")throw TypeError('"size" argument must be of type number');else if(e<0)throw RangeError('The value "'+e+'" is invalid for option "size"')}function ld(e,t,n){if(Lo(e),e<=0)return Le(e);if(t!==void 0)return typeof n==="string"?Le(e).fill(t,n):Le(e).fill(t);return Le(e)}g.alloc=function(e,t,n){return ld(e,t,n)};function Qn(e){return Lo(e),Le(e<0?0:Xn(e)|0)}g.allocUnsafe=function(e){return Qn(e)};g.allocUnsafeSlow=function(e){return Qn(e)};function cd(e,t){if(typeof t!=="string"||t==="")t="utf8";if(!g.isEncoding(t))throw TypeError("Unknown encoding: "+t);let n=Mo(e,t)|0,r=Le(n),o=r.write(e,t);if(o!==n)r=r.slice(0,o);return r}function Zn(e){let t=e.length<0?0:Xn(e.length)|0,n=Le(t);for(let r=0;r<t;r+=1)n[r]=e[r]&255;return n}function dd(e){if(Ce(e,Uint8Array)){let t=new Uint8Array(e);return Wn(t.buffer,t.byteOffset,t.byteLength)}return Zn(e)}function Wn(e,t,n){if(t<0||e.byteLength<t)throw RangeError('"offset" is outside of buffer bounds');if(e.byteLength<t+(n||0))throw RangeError('"length" is outside of buffer bounds');let r;if(t===void 0&&n===void 0)r=new Uint8Array(e);else if(n===void 0)r=new Uint8Array(e,t);else r=new Uint8Array(e,t,n);return Object.setPrototypeOf(r,g.prototype),r}function ud(e){if(g.isBuffer(e)){let t=Xn(e.length)|0,n=Le(t);if(n.length===0)return n;return e.copy(n,0,0,t),n}if(e.length!==void 0){if(typeof e.length!=="number"||Number.isNaN(e.length))return Le(0);return Zn(e)}if(e.type==="Buffer"&&Array.isArray(e.data))return Zn(e.data)}function Xn(e){if(e>=$n)throw RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+$n.toString(16)+" bytes");return e|0}g.isBuffer=function(e){return e!=null&&e._isBuffer===!0&&e!==g.prototype};g.compare=function(e,t){if(Ce(e,Uint8Array))e=g.from(e,e.offset,e.byteLength);if(Ce(t,Uint8Array))t=g.from(t,t.offset,t.byteLength);if(!g.isBuffer(e)||!g.isBuffer(t))throw TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');if(e===t)return 0;let n=e.length,r=t.length;for(let o=0,i=Math.min(n,r);o<i;++o)if(e[o]!==t[o]){n=e[o],r=t[o];break}if(n<r)return-1;if(r<n)return 1;return 0};g.isEncoding=function(e){switch(String(e).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}};g.concat=function(e,t){if(!Array.isArray(e))throw TypeError('"list" argument must be an Array of Buffers');if(e.length===0)return g.alloc(0);let n;if(t===void 0){t=0;for(n=0;n<e.length;++n)t+=e[n].length}let r=g.allocUnsafe(t),o=0;for(n=0;n<e.length;++n){let i=e[n];if(Ce(i,Uint8Array))if(o+i.length>r.length){if(!g.isBuffer(i))i=g.from(i);i.copy(r,o)}else Uint8Array.prototype.set.call(r,i,o);else if(!g.isBuffer(i))throw TypeError('"list" argument must be an Array of Buffers');else i.copy(r,o);o+=i.length}return r};function Mo(e,t){if(g.isBuffer(e))return e.length;if(ArrayBuffer.isView(e)||Ce(e,ArrayBuffer))return e.byteLength;if(typeof e!=="string")throw TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type '+typeof e);let n=e.length,r=arguments.length>2&&arguments[2]===!0;if(!r&&n===0)return 0;let o=!1;for(;;)switch(t){case"ascii":case"latin1":case"binary":return n;case"utf8":case"utf-8":return qn(e).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return n*2;case"hex":return n>>>1;case"base64":return Uo(e).length;default:if(o)return r?-1:qn(e).length;t=(""+t).toLowerCase(),o=!0}}g.byteLength=Mo;function pd(e,t,n){let r=!1;if(t===void 0||t<0)t=0;if(t>this.length)return"";if(n===void 0||n>this.length)n=this.length;if(n<=0)return"";if(n>>>=0,t>>>=0,n<=t)return"";if(!e)e="utf8";while(!0)switch(e){case"hex":return Sd(this,t,n);case"utf8":case"utf-8":return xo(this,t,n);case"ascii":return Ed(this,t,n);case"latin1":case"binary":return vd(this,t,n);case"base64":return bd(this,t,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return wd(this,t,n);default:if(r)throw TypeError("Unknown encoding: "+e);e=(e+"").toLowerCase(),r=!0}}g.prototype._isBuffer=!0;function Je(e,t,n){let r=e[t];e[t]=e[n],e[n]=r}g.prototype.swap16=function(){let e=this.length;if(e%2!==0)throw RangeError("Buffer size must be a multiple of 16-bits");for(let t=0;t<e;t+=2)Je(this,t,t+1);return this};g.prototype.swap32=function(){let e=this.length;if(e%4!==0)throw RangeError("Buffer size must be a multiple of 32-bits");for(let t=0;t<e;t+=4)Je(this,t,t+3),Je(this,t+1,t+2);return this};g.prototype.swap64=function(){let e=this.length;if(e%8!==0)throw RangeError("Buffer size must be a multiple of 64-bits");for(let t=0;t<e;t+=8)Je(this,t,t+7),Je(this,t+1,t+6),Je(this,t+2,t+5),Je(this,t+3,t+4);return this};g.prototype.toString=function(){let e=this.length;if(e===0)return"";if(arguments.length===0)return xo(this,0,e);return pd.apply(this,arguments)};g.prototype.toLocaleString=g.prototype.toString;g.prototype.equals=function(e){if(!g.isBuffer(e))throw TypeError("Argument must be a Buffer");if(this===e)return!0;return g.compare(this,e)===0};g.prototype.inspect=function(){let e="",t=id;if(e=this.toString("hex",0,t).replace(/(.{2})/g,"$1 ").trim(),this.length>t)e+=" ... ";return"<Buffer "+e+">"};if(wo)g.prototype[wo]=g.prototype.inspect;g.prototype.compare=function(e,t,n,r,o){if(Ce(e,Uint8Array))e=g.from(e,e.offset,e.byteLength);if(!g.isBuffer(e))throw TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type '+typeof e);if(t===void 0)t=0;if(n===void 0)n=e?e.length:0;if(r===void 0)r=0;if(o===void 0)o=this.length;if(t<0||n>e.length||r<0||o>this.length)throw RangeError("out of range index");if(r>=o&&t>=n)return 0;if(r>=o)return-1;if(t>=n)return 1;if(t>>>=0,n>>>=0,r>>>=0,o>>>=0,this===e)return 0;let i=o-r,s=n-t,l=Math.min(i,s),a=this.slice(r,o),c=e.slice(t,n);for(let d=0;d<l;++d)if(a[d]!==c[d]){i=a[d],s=c[d];break}if(i<s)return-1;if(s<i)return 1;return 0};function ko(e,t,n,r,o){if(e.length===0)return-1;if(typeof n==="string")r=n,n=0;else if(n>2147483647)n=2147483647;else if(n<-2147483648)n=-2147483648;if(n=+n,Number.isNaN(n))n=o?0:e.length-1;if(n<0)n=e.length+n;if(n>=e.length)if(o)return-1;else n=e.length-1;else if(n<0)if(o)n=0;else return-1;if(typeof t==="string")t=g.from(t,r);if(g.isBuffer(t)){if(t.length===0)return-1;return Io(e,t,n,r,o)}else if(typeof t==="number"){if(t=t&255,typeof Uint8Array.prototype.indexOf==="function")if(o)return Uint8Array.prototype.indexOf.call(e,t,n);else return Uint8Array.prototype.lastIndexOf.call(e,t,n);return Io(e,[t],n,r,o)}throw TypeError("val must be string, number or Buffer")}function Io(e,t,n,r,o){let i=1,s=e.length,l=t.length;if(r!==void 0){if(r=String(r).toLowerCase(),r==="ucs2"||r==="ucs-2"||r==="utf16le"||r==="utf-16le"){if(e.length<2||t.length<2)return-1;i=2,s/=2,l/=2,n/=2}}function a(d,p){if(i===1)return d[p];else return d.readUInt16BE(p*i)}let c;if(o){let d=-1;for(c=n;c<s;c++)if(a(e,c)===a(t,d===-1?0:c-d)){if(d===-1)d=c;if(c-d+1===l)return d*i}else{if(d!==-1)c-=c-d;d=-1}}else{if(n+l>s)n=s-l;for(c=n;c>=0;c--){let d=!0;for(let p=0;p<l;p++)if(a(e,c+p)!==a(t,p)){d=!1;break}if(d)return c}}return-1}g.prototype.includes=function(e,t,n){return this.indexOf(e,t,n)!==-1};g.prototype.indexOf=function(e,t,n){return ko(this,e,t,n,!0)};g.prototype.lastIndexOf=function(e,t,n){return ko(this,e,t,n,!1)};function hd(e,t,n,r){n=Number(n)||0;let o=e.length-n;if(!r)r=o;else if(r=Number(r),r>o)r=o;let i=t.length;if(r>i/2)r=i/2;let s;for(s=0;s<r;++s){let l=parseInt(t.substr(s*2,2),16);if(Number.isNaN(l))return s;e[n+s]=l}return s}function fd(e,t,n,r){return Ft(qn(t,e.length-n),e,n,r)}function _d(e,t,n,r){return Ft(Ad(t),e,n,r)}function md(e,t,n,r){return Ft(Uo(t),e,n,r)}function gd(e,t,n,r){return Ft(Nd(t,e.length-n),e,n,r)}g.prototype.write=function(e,t,n,r){if(t===void 0)r="utf8",n=this.length,t=0;else if(n===void 0&&typeof t==="string")r=t,n=this.length,t=0;else if(isFinite(t))if(t=t>>>0,isFinite(n)){if(n=n>>>0,r===void 0)r="utf8"}else r=n,n=void 0;else throw Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");let o=this.length-t;if(n===void 0||n>o)n=o;if(e.length>0&&(n<0||t<0)||t>this.length)throw RangeError("Attempt to write outside buffer bounds");if(!r)r="utf8";let i=!1;for(;;)switch(r){case"hex":return hd(this,e,t,n);case"utf8":case"utf-8":return fd(this,e,t,n);case"ascii":case"latin1":case"binary":return _d(this,e,t,n);case"base64":return md(this,e,t,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return gd(this,e,t,n);default:if(i)throw TypeError("Unknown encoding: "+r);r=(""+r).toLowerCase(),i=!0}};g.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};function bd(e,t,n){if(t===0&&n===e.length)return So(e);else return So(e.slice(t,n))}function xo(e,t,n){n=Math.min(e.length,n);let r=[],o=t;while(o<n){let i=e[o],s=null,l=i>239?4:i>223?3:i>191?2:1;if(o+l<=n){let a,c,d,p;switch(l){case 1:if(i<128)s=i;break;case 2:if(a=e[o+1],(a&192)===128){if(p=(i&31)<<6|a&63,p>127)s=p}break;case 3:if(a=e[o+1],c=e[o+2],(a&192)===128&&(c&192)===128){if(p=(i&15)<<12|(a&63)<<6|c&63,p>2047&&(p<55296||p>57343))s=p}break;case 4:if(a=e[o+1],c=e[o+2],d=e[o+3],(a&192)===128&&(c&192)===128&&(d&192)===128){if(p=(i&15)<<18|(a&63)<<12|(c&63)<<6|d&63,p>65535&&p<1114112)s=p}}}if(s===null)s=65533,l=1;else if(s>65535)s-=65536,r.push(s>>>10&1023|55296),s=56320|s&1023;r.push(s),o+=l}return yd(r)}var Co=4096;function yd(e){let t=e.length;if(t<=Co)return String.fromCharCode.apply(String,e);let n="",r=0;while(r<t)n+=String.fromCharCode.apply(String,e.slice(r,r+=Co));return n}function Ed(e,t,n){let r="";n=Math.min(e.length,n);for(let o=t;o<n;++o)r+=String.fromCharCode(e[o]&127);return r}function vd(e,t,n){let r="";n=Math.min(e.length,n);for(let o=t;o<n;++o)r+=String.fromCharCode(e[o]);return r}function Sd(e,t,n){let r=e.length;if(!t||t<0)t=0;if(!n||n<0||n>r)n=r;let o="";for(let i=t;i<n;++i)o+=Ld[e[i]];return o}function wd(e,t,n){let r=e.slice(t,n),o="";for(let i=0;i<r.length-1;i+=2)o+=String.fromCharCode(r[i]+r[i+1]*256);return o}g.prototype.slice=function(e,t){let n=this.length;if(e=~~e,t=t===void 0?n:~~t,e<0){if(e+=n,e<0)e=0}else if(e>n)e=n;if(t<0){if(t+=n,t<0)t=0}else if(t>n)t=n;if(t<e)t=e;let r=this.subarray(e,t);return Object.setPrototypeOf(r,g.prototype),r};function oe(e,t,n){if(e%1!==0||e<0)throw RangeError("offset is not uint");if(e+t>n)throw RangeError("Trying to access beyond buffer length")}g.prototype.readUintLE=g.prototype.readUIntLE=function(e,t,n){if(e=e>>>0,t=t>>>0,!n)oe(e,t,this.length);let r=this[e],o=1,i=0;while(++i<t&&(o*=256))r+=this[e+i]*o;return r};g.prototype.readUintBE=g.prototype.readUIntBE=function(e,t,n){if(e=e>>>0,t=t>>>0,!n)oe(e,t,this.length);let r=this[e+--t],o=1;while(t>0&&(o*=256))r+=this[e+--t]*o;return r};g.prototype.readUint8=g.prototype.readUInt8=function(e,t){if(e=e>>>0,!t)oe(e,1,this.length);return this[e]};g.prototype.readUint16LE=g.prototype.readUInt16LE=function(e,t){if(e=e>>>0,!t)oe(e,2,this.length);return this[e]|this[e+1]<<8};g.prototype.readUint16BE=g.prototype.readUInt16BE=function(e,t){if(e=e>>>0,!t)oe(e,2,this.length);return this[e]<<8|this[e+1]};g.prototype.readUint32LE=g.prototype.readUInt32LE=function(e,t){if(e=e>>>0,!t)oe(e,4,this.length);return(this[e]|this[e+1]<<8|this[e+2]<<16)+this[e+3]*16777216};g.prototype.readUint32BE=g.prototype.readUInt32BE=function(e,t){if(e=e>>>0,!t)oe(e,4,this.length);return this[e]*16777216+(this[e+1]<<16|this[e+2]<<8|this[e+3])};g.prototype.readBigUInt64LE=Oe(function(e){e=e>>>0,Qe(e,"offset");let t=this[e],n=this[e+7];if(t===void 0||n===void 0)ht(e,this.length-8);let r=t+this[++e]*256+this[++e]*65536+this[++e]*16777216,o=this[++e]+this[++e]*256+this[++e]*65536+n*16777216;return BigInt(r)+(BigInt(o)<<BigInt(32))});g.prototype.readBigUInt64BE=Oe(function(e){e=e>>>0,Qe(e,"offset");let t=this[e],n=this[e+7];if(t===void 0||n===void 0)ht(e,this.length-8);let r=t*16777216+this[++e]*65536+this[++e]*256+this[++e],o=this[++e]*16777216+this[++e]*65536+this[++e]*256+n;return(BigInt(r)<<BigInt(32))+BigInt(o)});g.prototype.readIntLE=function(e,t,n){if(e=e>>>0,t=t>>>0,!n)oe(e,t,this.length);let r=this[e],o=1,i=0;while(++i<t&&(o*=256))r+=this[e+i]*o;if(o*=128,r>=o)r-=Math.pow(2,8*t);return r};g.prototype.readIntBE=function(e,t,n){if(e=e>>>0,t=t>>>0,!n)oe(e,t,this.length);let r=t,o=1,i=this[e+--r];while(r>0&&(o*=256))i+=this[e+--r]*o;if(o*=128,i>=o)i-=Math.pow(2,8*t);return i};g.prototype.readInt8=function(e,t){if(e=e>>>0,!t)oe(e,1,this.length);if(!(this[e]&128))return this[e];return(255-this[e]+1)*-1};g.prototype.readInt16LE=function(e,t){if(e=e>>>0,!t)oe(e,2,this.length);let n=this[e]|this[e+1]<<8;return n&32768?n|4294901760:n};g.prototype.readInt16BE=function(e,t){if(e=e>>>0,!t)oe(e,2,this.length);let n=this[e+1]|this[e]<<8;return n&32768?n|4294901760:n};g.prototype.readInt32LE=function(e,t){if(e=e>>>0,!t)oe(e,4,this.length);return this[e]|this[e+1]<<8|this[e+2]<<16|this[e+3]<<24};g.prototype.readInt32BE=function(e,t){if(e=e>>>0,!t)oe(e,4,this.length);return this[e]<<24|this[e+1]<<16|this[e+2]<<8|this[e+3]};g.prototype.readBigInt64LE=Oe(function(e){e=e>>>0,Qe(e,"offset");let t=this[e],n=this[e+7];if(t===void 0||n===void 0)ht(e,this.length-8);let r=this[e+4]+this[e+5]*256+this[e+6]*65536+(n<<24);return(BigInt(r)<<BigInt(32))+BigInt(t+this[++e]*256+this[++e]*65536+this[++e]*16777216)});g.prototype.readBigInt64BE=Oe(function(e){e=e>>>0,Qe(e,"offset");let t=this[e],n=this[e+7];if(t===void 0||n===void 0)ht(e,this.length-8);let r=(t<<24)+this[++e]*65536+this[++e]*256+this[++e];return(BigInt(r)<<BigInt(32))+BigInt(this[++e]*16777216+this[++e]*65536+this[++e]*256+n)});g.prototype.readFloatLE=function(e,t){if(e=e>>>0,!t)oe(e,4,this.length);return Pt(this,e,!0,23,4)};g.prototype.readFloatBE=function(e,t){if(e=e>>>0,!t)oe(e,4,this.length);return Pt(this,e,!1,23,4)};g.prototype.readDoubleLE=function(e,t){if(e=e>>>0,!t)oe(e,8,this.length);return Pt(this,e,!0,52,8)};g.prototype.readDoubleBE=function(e,t){if(e=e>>>0,!t)oe(e,8,this.length);return Pt(this,e,!1,52,8)};function fe(e,t,n,r,o,i){if(!g.isBuffer(e))throw TypeError('"buffer" argument must be a Buffer instance');if(t>o||t<i)throw RangeError('"value" argument is out of bounds');if(n+r>e.length)throw RangeError("Index out of range")}g.prototype.writeUintLE=g.prototype.writeUIntLE=function(e,t,n,r){if(e=+e,t=t>>>0,n=n>>>0,!r){let s=Math.pow(2,8*n)-1;fe(this,e,t,n,s,0)}let o=1,i=0;this[t]=e&255;while(++i<n&&(o*=256))this[t+i]=e/o&255;return t+n};g.prototype.writeUintBE=g.prototype.writeUIntBE=function(e,t,n,r){if(e=+e,t=t>>>0,n=n>>>0,!r){let s=Math.pow(2,8*n)-1;fe(this,e,t,n,s,0)}let o=n-1,i=1;this[t+o]=e&255;while(--o>=0&&(i*=256))this[t+o]=e/i&255;return t+n};g.prototype.writeUint8=g.prototype.writeUInt8=function(e,t,n){if(e=+e,t=t>>>0,!n)fe(this,e,t,1,255,0);return this[t]=e&255,t+1};g.prototype.writeUint16LE=g.prototype.writeUInt16LE=function(e,t,n){if(e=+e,t=t>>>0,!n)fe(this,e,t,2,65535,0);return this[t]=e&255,this[t+1]=e>>>8,t+2};g.prototype.writeUint16BE=g.prototype.writeUInt16BE=function(e,t,n){if(e=+e,t=t>>>0,!n)fe(this,e,t,2,65535,0);return this[t]=e>>>8,this[t+1]=e&255,t+2};g.prototype.writeUint32LE=g.prototype.writeUInt32LE=function(e,t,n){if(e=+e,t=t>>>0,!n)fe(this,e,t,4,4294967295,0);return this[t+3]=e>>>24,this[t+2]=e>>>16,this[t+1]=e>>>8,this[t]=e&255,t+4};g.prototype.writeUint32BE=g.prototype.writeUInt32BE=function(e,t,n){if(e=+e,t=t>>>0,!n)fe(this,e,t,4,4294967295,0);return this[t]=e>>>24,this[t+1]=e>>>16,this[t+2]=e>>>8,this[t+3]=e&255,t+4};function jo(e,t,n,r,o){Do(t,r,o,e,n,7);let i=Number(t&BigInt(4294967295));e[n++]=i,i=i>>8,e[n++]=i,i=i>>8,e[n++]=i,i=i>>8,e[n++]=i;let s=Number(t>>BigInt(32)&BigInt(4294967295));return e[n++]=s,s=s>>8,e[n++]=s,s=s>>8,e[n++]=s,s=s>>8,e[n++]=s,n}function Oo(e,t,n,r,o){Do(t,r,o,e,n,7);let i=Number(t&BigInt(4294967295));e[n+7]=i,i=i>>8,e[n+6]=i,i=i>>8,e[n+5]=i,i=i>>8,e[n+4]=i;let s=Number(t>>BigInt(32)&BigInt(4294967295));return e[n+3]=s,s=s>>8,e[n+2]=s,s=s>>8,e[n+1]=s,s=s>>8,e[n]=s,n+8}g.prototype.writeBigUInt64LE=Oe(function(e,t=0){return jo(this,e,t,BigInt(0),BigInt("0xffffffffffffffff"))});g.prototype.writeBigUInt64BE=Oe(function(e,t=0){return Oo(this,e,t,BigInt(0),BigInt("0xffffffffffffffff"))});g.prototype.writeIntLE=function(e,t,n,r){if(e=+e,t=t>>>0,!r){let l=Math.pow(2,8*n-1);fe(this,e,t,n,l-1,-l)}let o=0,i=1,s=0;this[t]=e&255;while(++o<n&&(i*=256)){if(e<0&&s===0&&this[t+o-1]!==0)s=1;this[t+o]=(e/i>>0)-s&255}return t+n};g.prototype.writeIntBE=function(e,t,n,r){if(e=+e,t=t>>>0,!r){let l=Math.pow(2,8*n-1);fe(this,e,t,n,l-1,-l)}let o=n-1,i=1,s=0;this[t+o]=e&255;while(--o>=0&&(i*=256)){if(e<0&&s===0&&this[t+o+1]!==0)s=1;this[t+o]=(e/i>>0)-s&255}return t+n};g.prototype.writeInt8=function(e,t,n){if(e=+e,t=t>>>0,!n)fe(this,e,t,1,127,-128);if(e<0)e=255+e+1;return this[t]=e&255,t+1};g.prototype.writeInt16LE=function(e,t,n){if(e=+e,t=t>>>0,!n)fe(this,e,t,2,32767,-32768);return this[t]=e&255,this[t+1]=e>>>8,t+2};g.prototype.writeInt16BE=function(e,t,n){if(e=+e,t=t>>>0,!n)fe(this,e,t,2,32767,-32768);return this[t]=e>>>8,this[t+1]=e&255,t+2};g.prototype.writeInt32LE=function(e,t,n){if(e=+e,t=t>>>0,!n)fe(this,e,t,4,2147483647,-2147483648);return this[t]=e&255,this[t+1]=e>>>8,this[t+2]=e>>>16,this[t+3]=e>>>24,t+4};g.prototype.writeInt32BE=function(e,t,n){if(e=+e,t=t>>>0,!n)fe(this,e,t,4,2147483647,-2147483648);if(e<0)e=4294967295+e+1;return this[t]=e>>>24,this[t+1]=e>>>16,this[t+2]=e>>>8,this[t+3]=e&255,t+4};g.prototype.writeBigInt64LE=Oe(function(e,t=0){return jo(this,e,t,-BigInt("0x8000000000000000"),BigInt("0x7fffffffffffffff"))});g.prototype.writeBigInt64BE=Oe(function(e,t=0){return Oo(this,e,t,-BigInt("0x8000000000000000"),BigInt("0x7fffffffffffffff"))});function Ro(e,t,n,r,o,i){if(n+r>e.length)throw RangeError("Index out of range");if(n<0)throw RangeError("Index out of range")}function Po(e,t,n,r,o){if(t=+t,n=n>>>0,!o)Ro(e,t,n,4,340282346638528860000000000000000000000,-340282346638528860000000000000000000000);return Ao(e,t,n,r,23,4),n+4}g.prototype.writeFloatLE=function(e,t,n){return Po(this,e,t,!0,n)};g.prototype.writeFloatBE=function(e,t,n){return Po(this,e,t,!1,n)};function Fo(e,t,n,r,o){if(t=+t,n=n>>>0,!o)Ro(e,t,n,8,179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,-179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000);return Ao(e,t,n,r,52,8),n+8}g.prototype.writeDoubleLE=function(e,t,n){return Fo(this,e,t,!0,n)};g.prototype.writeDoubleBE=function(e,t,n){return Fo(this,e,t,!1,n)};g.prototype.copy=function(e,t,n,r){if(!g.isBuffer(e))throw TypeError("argument should be a Buffer");if(!n)n=0;if(!r&&r!==0)r=this.length;if(t>=e.length)t=e.length;if(!t)t=0;if(r>0&&r<n)r=n;if(r===n)return 0;if(e.length===0||this.length===0)return 0;if(t<0)throw RangeError("targetStart out of bounds");if(n<0||n>=this.length)throw RangeError("Index out of range");if(r<0)throw RangeError("sourceEnd out of bounds");if(r>this.length)r=this.length;if(e.length-t<r-n)r=e.length-t+n;let o=r-n;if(this===e&&typeof Uint8Array.prototype.copyWithin==="function")this.copyWithin(t,n,r);else Uint8Array.prototype.set.call(e,this.subarray(n,r),t);return o};g.prototype.fill=function(e,t,n,r){if(typeof e==="string"){if(typeof t==="string")r=t,t=0,n=this.length;else if(typeof n==="string")r=n,n=this.length;if(r!==void 0&&typeof r!=="string")throw TypeError("encoding must be a string");if(typeof r==="string"&&!g.isEncoding(r))throw TypeError("Unknown encoding: "+r);if(e.length===1){let i=e.charCodeAt(0);if(r==="utf8"&&i<128||r==="latin1")e=i}}else if(typeof e==="number")e=e&255;else if(typeof e==="boolean")e=Number(e);if(t<0||this.length<t||this.length<n)throw RangeError("Out of range index");if(n<=t)return this;if(t=t>>>0,n=n===void 0?this.length:n>>>0,!e)e=0;let o;if(typeof e==="number")for(o=t;o<n;++o)this[o]=e;else{let i=g.isBuffer(e)?e:g.from(e,r),s=i.length;if(s===0)throw TypeError('The value "'+e+'" is invalid for argument "value"');for(o=0;o<n-t;++o)this[o+t]=i[o%s]}return this};function To(e){let t="",n=e.length,r=e[0]==="-"?1:0;for(;n>=r+4;n-=3)t=`_${e.slice(n-3,n)}${t}`;return`${e.slice(0,n)}${t}`}function Id(e,t,n){if(Qe(t,"offset"),e[t]===void 0||e[t+n]===void 0)ht(t,e.length-(n+1))}function Do(e,t,n,r,o,i){if(e>n||e<t){let s=typeof t==="bigint"?"n":"",l;if(i>3)if(t===0||t===BigInt(0))l=`>= 0${s} and < 2${s} ** ${(i+1)*8}${s}`;else l=`>= -(2${s} ** ${(i+1)*8-1}${s}) and < 2 ** ${(i+1)*8-1}${s}`;else l=`>= ${t}${s} and <= ${n}${s}`;throw new Hn("value",l,e)}Id(r,o,i)}function Qe(e,t){if(typeof e!=="number")throw new ad(t,"number",e)}function ht(e,t,n){if(Math.floor(e)!==e)throw Qe(e,n),new Hn(n||"offset","an integer",e);if(t<0)throw new sd;throw new Hn(n||"offset",`>= ${n?1:0} and <= ${t}`,e)}var Cd=/[^+/0-9A-Za-z-_]/g;function Td(e){if(e=e.split("=")[0],e=e.trim().replace(Cd,""),e.length<2)return"";while(e.length%4!==0)e=e+"=";return e}function qn(e,t){t=t||1/0;let n,r=e.length,o=null,i=[];for(let s=0;s<r;++s){if(n=e.charCodeAt(s),n>55295&&n<57344){if(!o){if(n>56319){if((t-=3)>-1)i.push(239,191,189);continue}else if(s+1===r){if((t-=3)>-1)i.push(239,191,189);continue}o=n;continue}if(n<56320){if((t-=3)>-1)i.push(239,191,189);o=n;continue}n=(o-55296<<10|n-56320)+65536}else if(o){if((t-=3)>-1)i.push(239,191,189)}if(o=null,n<128){if((t-=1)<0)break;i.push(n)}else if(n<2048){if((t-=2)<0)break;i.push(n>>6|192,n&63|128)}else if(n<65536){if((t-=3)<0)break;i.push(n>>12|224,n>>6&63|128,n&63|128)}else if(n<1114112){if((t-=4)<0)break;i.push(n>>18|240,n>>12&63|128,n>>6&63|128,n&63|128)}else throw Error("Invalid code point")}return i}function Ad(e){let t=[];for(let n=0;n<e.length;++n)t.push(e.charCodeAt(n)&255);return t}function Nd(e,t){let n,r,o,i=[];for(let s=0;s<e.length;++s){if((t-=2)<0)break;n=e.charCodeAt(s),r=n>>8,o=n%256,i.push(o),i.push(r)}return i}function Uo(e){return nd(Td(e))}function Ft(e,t,n,r){let o;for(o=0;o<r;++o){if(o+n>=t.length||o>=e.length)break;t[o+n]=e[o]}return o}function Ce(e,t){return e instanceof t||e!=null&&e.constructor!=null&&e.constructor.name!=null&&e.constructor.name===t.name}var Ld=function(){let e=Array(256);for(let t=0;t<16;++t){let n=t*16;for(let r=0;r<16;++r)e[n+r]="0123456789abcdef"[t]+"0123456789abcdef"[r]}return e}();function Oe(e){return typeof BigInt>"u"?Md:e}function Md(){throw Error("BigInt not supported")}function Yn(e){return()=>{throw Error(e+" is not implemented for node:buffer browser polyfill")}}var Np=Yn("resolveObjectURL"),Lp=Yn("isUtf8");var Mp=Yn("transcode");var ft=1,nr=256,zo=65536,kd=305419896,Vo=32,Bo=12,Jo=8,Go=8,$o=4,Ho=4,Zo=12,xd=0,jd=1,Od=2,Rd=3,Pd=4,Fd=5,Dd=6,Ud=4096,zd=4097,Vd=4099,Bd=8192,Jd=8193,Gd=8194,$d=8195,Hd=8196,Zd=8198,Wd=24,qd=28,Kd=2,Qd=24,Wo=g.from([3,0,7,14,0]),er="Ldalvik/annotation/Throws;",Xd=g.from([0]);function Yd(e){let t=new Ko,n=Object.assign({},e);return t.addClass(n),t.build()}class Ko{constructor(){this.classes=[]}addClass(e){this.classes.push(e)}build(){let e=nu(this.classes),{classes:t,interfaces:n,fields:r,methods:o,protos:i,parameters:s,annotationDirectories:l,annotationSets:a,throwsAnnotations:c,types:d,strings:p}=e,u=0,h=0,_=8,f=12,m=20,y=112;u+=y;let E=u,k=p.length*Ho;u+=k;let T=u,O=d.length*$o;u+=O;let M=u,j=i.length*Bo;u+=j;let v=u,L=r.length*Jo;u+=L;let S=u,x=o.length*Go;u+=x;let I=u,P=t.length*Vo;u+=P;let F=u,z=a.map((A)=>{let R=u;return A.offset=R,u+=4+A.items.length*4,R}),D=t.reduce((A,R)=>(R.classData.constructorMethods.forEach((q)=>{let[,K,Q]=q;if((K&nr)===0&&Q>=0)q.push(u),A.push({offset:u,superConstructor:Q}),u+=Qd}),A),[]);l.forEach((A)=>{A.offset=u,u+=16+A.methods.length*8});let V=n.map((A)=>{u=tr(u,4);let R=u;return A.offset=R,u+=4+2*A.types.length,R}),Z=s.map((A)=>{u=tr(u,4);let R=u;return A.offset=R,u+=4+2*A.types.length,R}),le=[],W=p.map((A)=>{let R=u,U=g.from(me(A.length)),q=g.from(A,"utf8"),K=g.concat([U,q,Xd]);return le.push(K),u+=K.length,R}),ae=D.map((A)=>{let R=u;return u+=Wo.length,R}),ne=c.map((A)=>{let R=tu(A);return A.offset=u,u+=R.length,R}),te=t.map((A,R)=>{A.classData.offset=u;let U=eu(A);return u+=U.length,U}),_e=0,Pe=0;u=tr(u,4);let ke=u,H=n.length+s.length,ge=4+(r.length>0?1:0)+2+a.length+D.length+l.length+(H>0?1:0)+1+ae.length+c.length+t.length+1,xe=4+ge*Zo;u+=xe;let Fe=u-F,Te=u,C=g.alloc(Te);C.write(`dex
035`),C.writeUInt32LE(Te,32),C.writeUInt32LE(y,36),C.writeUInt32LE(kd,40),C.writeUInt32LE(_e,44),C.writeUInt32LE(Pe,48),C.writeUInt32LE(ke,52),C.writeUInt32LE(p.length,56),C.writeUInt32LE(E,60),C.writeUInt32LE(d.length,64),C.writeUInt32LE(T,68),C.writeUInt32LE(i.length,72),C.writeUInt32LE(M,76),C.writeUInt32LE(r.length,80),C.writeUInt32LE(r.length>0?v:0,84),C.writeUInt32LE(o.length,88),C.writeUInt32LE(S,92),C.writeUInt32LE(t.length,96),C.writeUInt32LE(I,100),C.writeUInt32LE(Fe,104),C.writeUInt32LE(F,108),W.forEach((A,R)=>{C.writeUInt32LE(A,E+R*Ho)}),d.forEach((A,R)=>{C.writeUInt32LE(A,T+R*$o)}),i.forEach((A,R)=>{let[U,q,K]=A,Q=M+R*Bo;C.writeUInt32LE(U,Q),C.writeUInt32LE(q,Q+4),C.writeUInt32LE(K!==null?K.offset:0,Q+8)}),r.forEach((A,R)=>{let[U,q,K]=A,Q=v+R*Jo;C.writeUInt16LE(U,Q),C.writeUInt16LE(q,Q+2),C.writeUInt32LE(K,Q+4)}),o.forEach((A,R)=>{let[U,q,K]=A,Q=S+R*Go;C.writeUInt16LE(U,Q),C.writeUInt16LE(q,Q+2),C.writeUInt32LE(K,Q+4)}),t.forEach((A,R)=>{let{interfaces:U,annotationsDirectory:q}=A,K=U!==null?U.offset:0,Q=q!==null?q.offset:0,Bt=0,ve=I+R*Vo;C.writeUInt32LE(A.index,ve),C.writeUInt32LE(A.accessFlags,ve+4),C.writeUInt32LE(A.superClassIndex,ve+8),C.writeUInt32LE(K,ve+12),C.writeUInt32LE(A.sourceFileIndex,ve+16),C.writeUInt32LE(Q,ve+20),C.writeUInt32LE(A.classData.offset,ve+24),C.writeUInt32LE(0,ve+28)}),a.forEach((A,R)=>{let{items:U}=A,q=z[R];C.writeUInt32LE(U.length,q),U.forEach((K,Q)=>{C.writeUInt32LE(K.offset,q+4+Q*4)})}),D.forEach((A,R)=>{let{offset:U,superConstructor:q}=A,K=1,Q=1,Bt=1,ve=0,Jt=4;C.writeUInt16LE(1,U),C.writeUInt16LE(1,U+2),C.writeUInt16LE(1,U+4),C.writeUInt16LE(0,U+6),C.writeUInt32LE(ae[R],U+8),C.writeUInt32LE(4,U+12),C.writeUInt16LE(4208,U+16),C.writeUInt16LE(q,U+18),C.writeUInt16LE(0,U+20),C.writeUInt16LE(14,U+22)}),l.forEach((A)=>{let R=A.offset,U=0,q=0,K=A.methods.length,Q=0;C.writeUInt32LE(0,R),C.writeUInt32LE(0,R+4),C.writeUInt32LE(K,R+8),C.writeUInt32LE(0,R+12),A.methods.forEach((Bt,ve)=>{let Jt=R+16+ve*8,[Ci,Ti]=Bt;C.writeUInt32LE(Ci,Jt),C.writeUInt32LE(Ti.offset,Jt+4)})}),n.forEach((A,R)=>{let U=V[R];C.writeUInt32LE(A.types.length,U),A.types.forEach((q,K)=>{C.writeUInt16LE(q,U+4+K*2)})}),s.forEach((A,R)=>{let U=Z[R];C.writeUInt32LE(A.types.length,U),A.types.forEach((q,K)=>{C.writeUInt16LE(q,U+4+K*2)})}),le.forEach((A,R)=>{A.copy(C,W[R])}),ae.forEach((A)=>{Wo.copy(C,A)}),ne.forEach((A,R)=>{A.copy(C,c[R].offset)}),te.forEach((A,R)=>{A.copy(C,t[R].classData.offset)}),C.writeUInt32LE(ge,ke);let ie=[[xd,1,h],[jd,p.length,E],[Od,d.length,T],[Rd,i.length,M]];if(r.length>0)ie.push([Pd,r.length,v]);if(ie.push([Fd,o.length,S]),ie.push([Dd,t.length,I]),a.forEach((A,R)=>{ie.push([Vd,A.items.length,z[R]])}),D.forEach((A)=>{ie.push([Jd,1,A.offset])}),l.forEach((A)=>{ie.push([Zd,1,A.offset])}),H>0)ie.push([zd,H,V.concat(Z)[0]]);ie.push([Gd,p.length,W[0]]),ae.forEach((A)=>{ie.push([$d,1,A])}),c.forEach((A)=>{ie.push([Hd,1,A.offset])}),t.forEach((A)=>{ie.push([Bd,1,A.classData.offset])}),ie.push([Ud,1,ke]),ie.forEach((A,R)=>{let[U,q,K]=A,Q=ke+4+R*Zo;C.writeUInt16LE(U,Q),C.writeUInt32LE(q,Q+4),C.writeUInt32LE(K,Q+8)});let He=new Checksum("sha1");return He.update(C.slice(f+m)),g.from(He.getDigest()).copy(C,f),C.writeUInt32LE(lu(C,f),_),C}}function eu(e){let{instanceFields:t,constructorMethods:n,virtualMethods:r}=e.classData,o=0;return g.from([0].concat(me(t.length)).concat(me(n.length)).concat(me(r.length)).concat(t.reduce((i,[s,l])=>i.concat(me(s)).concat(me(l)),[])).concat(n.reduce((i,[s,l,,a])=>i.concat(me(s)).concat(me(l)).concat(me(a||0)),[])).concat(r.reduce((i,[s,l])=>i.concat(me(s)).concat(me(l)).concat([0]),[])))}function tu(e){let{thrownTypes:t}=e;return g.from([Kd].concat(me(e.type)).concat([1]).concat(me(e.value)).concat([qd,t.length]).concat(t.reduce((n,r)=>(n.push(Wd,r),n),[])))}function nu(e){let t=new Set,n=new Set,r={},o=[],i=[],s={},l=new Set,a=new Set;e.forEach((I)=>{let{name:P,superClass:F,sourceFileName:z}=I;if(t.add("this"),t.add(P),n.add(P),t.add(F),n.add(F),t.add(z),I.interfaces.forEach((D)=>{t.add(D),n.add(D)}),I.fields.forEach((D)=>{let[V,Z]=D;t.add(V),t.add(Z),n.add(Z),o.push([I.name,Z,V])}),!I.methods.some(([D])=>D==="<init>"))I.methods.unshift(["<init>","V",[]]),l.add(P);I.methods.forEach((D)=>{let[V,Z,le,W=[],ae]=D;t.add(V);let ne=c(Z,le),te=null;if(W.length>0){let _e=W.slice();_e.sort(),te=_e.join("|");let Pe=s[te];if(Pe===void 0)Pe={id:te,types:_e},s[te]=Pe;t.add(er),n.add(er),W.forEach((ke)=>{t.add(ke),n.add(ke)}),t.add("value")}if(i.push([I.name,ne,V,te,ae]),V==="<init>"){a.add(P+"|"+ne);let _e=F+"|"+ne;if(l.has(P)&&!a.has(_e))i.push([F,ne,V,null,0]),a.add(_e)}})});function c(I,P){let F=[I].concat(P),z=F.join("|");if(r[z]!==void 0)return z;t.add(I),n.add(I),P.forEach((V)=>{t.add(V),n.add(V)});let D=F.map(au).join("");return t.add(D),r[z]=[z,D,I,P],z}let d=Array.from(t);d.sort();let p=d.reduce((I,P,F)=>(I[P]=F,I),{}),u=Array.from(n).map((I)=>p[I]);u.sort(qo);let h=u.reduce((I,P,F)=>(I[d[P]]=F,I),{}),_=Object.keys(r).map((I)=>r[I]);_.sort(ou);let f={},m=_.map((I)=>{let[,P,F,z]=I,D;if(z.length>0){let V=z.join("|");if(D=f[V],D===void 0)D={types:z.map((Z)=>h[Z]),offset:-1},f[V]=D}else D=null;return[p[P],h[F],D]}),y=_.reduce((I,P,F)=>{let[z]=P;return I[z]=F,I},{}),E=Object.keys(f).map((I)=>f[I]),k=o.map((I)=>{let[P,F,z]=I;return[h[P],h[F],p[z]]});k.sort(iu);let T=i.map((I)=>{let[P,F,z,D,V]=I;return[h[P],y[F],p[z],D,V]});T.sort(su);let O=Object.keys(s).map((I)=>s[I]).map((I)=>({id:I.id,type:h[er],value:p.value,thrownTypes:I.types.map((P)=>h[P]),offset:-1})),M=O.map((I)=>({id:I.id,items:[I],offset:-1})),j=M.reduce((I,P,F)=>(I[P.id]=F,I),{}),v={},L=[],S=e.map((I)=>{let P=h[I.name],F=ft,z=h[I.superClass],D,V=I.interfaces.map((H)=>h[H]);if(V.length>0){V.sort(qo);let H=V.join("|");if(D=v[H],D===void 0)D={types:V,offset:-1},v[H]=D}else D=null;let Z=p[I.sourceFileName],le=T.reduce((H,ge,xe)=>{let[Fe,Te,C,ie,He]=ge;if(Fe===P)H.push([xe,C,ie,Te,He]);return H},[]),W=null,ae=le.filter(([,,H])=>H!==null).map(([H,,ge])=>[H,M[j[ge]]]);if(ae.length>0)W={methods:ae,offset:-1},L.push(W);let ne=k.reduce((H,ge,xe)=>{let[Fe]=ge;if(Fe===P)H.push([xe>0?1:0,ft]);return H},[]),te=p["<init>"],_e=le.filter(([,H])=>H===te).map(([H,,,ge])=>{if(l.has(I.name)){let xe=-1,Fe=T.length;for(let Te=0;Te!==Fe;Te++){let[C,ie,He]=T[Te];if(C===z&&He===te&&ie===ge){xe=Te;break}}return[H,ft|zo,xe]}else return[H,ft|zo|nr,-1]}),Pe=ru(le.filter(([,H])=>H!==te).map(([H,,,,ge])=>[H,ge|ft|nr]));return{index:P,accessFlags:F,superClassIndex:z,interfaces:D,sourceFileIndex:Z,annotationsDirectory:W,classData:{instanceFields:ne,constructorMethods:_e,virtualMethods:Pe,offset:-1}}}),x=Object.keys(v).map((I)=>v[I]);return{classes:S,interfaces:x,fields:k,methods:T,protos:m,parameters:E,annotationDirectories:L,annotationSets:M,throwsAnnotations:O,types:u,strings:d}}function ru(e){let t=0;return e.map(([n,r],o)=>{let i;if(o===0)i=[n,r];else i=[n-t,r];return t=n,i})}function qo(e,t){return e-t}function ou(e,t){let[,,n,r]=e,[,,o,i]=t;if(n<o)return-1;if(n>o)return 1;let s=r.join("|"),l=i.join("|");if(s<l)return-1;if(s>l)return 1;return 0}function iu(e,t){let[n,r,o]=e,[i,s,l]=t;if(n!==i)return n-i;if(o!==l)return o-l;return r-s}function su(e,t){let[n,r,o]=e,[i,s,l]=t;if(n!==i)return n-i;if(o!==l)return o-l;return r-s}function au(e){let t=e[0];return t==="L"||t==="["?"L":e}function me(e){if(e<=127)return[e];let t=[],n=!1;do{let r=e&127;if(e>>=7,n=e!==0,n)r|=128;t.push(r)}while(n);return t}function tr(e,t){let n=e%t;if(n===0)return e;return e+t-n}function lu(e,t){let n=1,r=0,o=e.length;for(let i=t;i<o;i++)n=(n+e[i])%65521,r=(r+n)%65521;return(r<<16|n)>>>0}var Qo=Yd;var cu=1,rr=null,Xo=null;function Yo(e){rr=e}function or(e,t,n){let r=Xe(e);if(r===null)if(e.indexOf("[")===0)r=ir(e,t,n);else{if(e[0]==="L"&&e[e.length-1]===";")e=e.substring(1,e.length-1);r=uu(e,t,n)}return Object.assign({className:e},r)}var ei={boolean:{name:"Z",type:"uint8",size:1,byteSize:1,defaultValue:!1,isCompatible(e){return typeof e==="boolean"},fromJni(e){return!!e},toJni(e){return e?1:0},read(e){return e.readU8()},write(e,t){e.writeU8(t)},toString(){return this.name}},byte:{name:"B",type:"int8",size:1,byteSize:1,defaultValue:0,isCompatible(e){return Number.isInteger(e)&&e>=-128&&e<=127},fromJni:Ee,toJni:Ee,read(e){return e.readS8()},write(e,t){e.writeS8(t)},toString(){return this.name}},char:{name:"C",type:"uint16",size:1,byteSize:2,defaultValue:0,isCompatible(e){if(typeof e!=="string"||e.length!==1)return!1;let t=e.charCodeAt(0);return t>=0&&t<=65535},fromJni(e){return String.fromCharCode(e)},toJni(e){return e.charCodeAt(0)},read(e){return e.readU16()},write(e,t){e.writeU16(t)},toString(){return this.name}},short:{name:"S",type:"int16",size:1,byteSize:2,defaultValue:0,isCompatible(e){return Number.isInteger(e)&&e>=-32768&&e<=32767},fromJni:Ee,toJni:Ee,read(e){return e.readS16()},write(e,t){e.writeS16(t)},toString(){return this.name}},int:{name:"I",type:"int32",size:1,byteSize:4,defaultValue:0,isCompatible(e){return Number.isInteger(e)&&e>=-2147483648&&e<=2147483647},fromJni:Ee,toJni:Ee,read(e){return e.readS32()},write(e,t){e.writeS32(t)},toString(){return this.name}},long:{name:"J",type:"int64",size:2,byteSize:8,defaultValue:0,isCompatible(e){return typeof e==="number"||e instanceof Int64},fromJni:Ee,toJni:Ee,read(e){return e.readS64()},write(e,t){e.writeS64(t)},toString(){return this.name}},float:{name:"F",type:"float",size:1,byteSize:4,defaultValue:0,isCompatible(e){return typeof e==="number"},fromJni:Ee,toJni:Ee,read(e){return e.readFloat()},write(e,t){e.writeFloat(t)},toString(){return this.name}},double:{name:"D",type:"double",size:2,byteSize:8,defaultValue:0,isCompatible(e){return typeof e==="number"},fromJni:Ee,toJni:Ee,read(e){return e.readDouble()},write(e,t){e.writeDouble(t)},toString(){return this.name}},void:{name:"V",type:"void",size:0,byteSize:0,defaultValue:void 0,isCompatible(e){return e===void 0},fromJni(){return},toJni(){return NULL},toString(){return this.name}}},du=new Set(Object.values(ei).map((e)=>e.name));function Xe(e){let t=ei[e];return t!==void 0?t:null}function uu(e,t,n){let r=n._types[t?1:0],o=r[e];if(o!==void 0)return o;if(e==="java.lang.Object")o=pu(n);else o=hu(e,t,n);return r[e]=o,o}function pu(e){return{name:"Ljava/lang/Object;",type:"pointer",size:1,defaultValue:NULL,isCompatible(t){if(t===null)return!0;if(t===void 0)return!1;if(t.$h instanceof NativePointer)return!0;return typeof t==="string"},fromJni(t,n,r){if(t.isNull())return null;return e.cast(t,e.use("java.lang.Object"),r)},toJni(t,n){if(t===null)return NULL;if(typeof t==="string")return n.newStringUtf(t);return t.$h}}}function hu(e,t,n){let r=null,o=null,i=null;function s(){if(r===null)r=n.use(e).class;return r}function l(c){let d=s();if(o===null)o=d.isInstance.overload("java.lang.Object");return o.call(d,c)}function a(){if(i===null){let c=s();i=n.use("java.lang.String").class.isAssignableFrom(c)}return i}return{name:Ge(e),type:"pointer",size:1,defaultValue:NULL,isCompatible(c){if(c===null)return!0;if(c===void 0)return!1;if(c.$h instanceof NativePointer)return l(c);return typeof c==="string"&&a()},fromJni(c,d,p){if(c.isNull())return null;if(a()&&t)return d.stringFromJni(c);return n.cast(c,n.use(e),p)},toJni(c,d){if(c===null)return NULL;if(typeof c==="string")return d.newStringUtf(c);return c.$h},toString(){return this.name}}}var fu=[["Z","boolean"],["B","byte"],["C","char"],["D","double"],["F","float"],["I","int"],["J","long"],["S","short"]].reduce((e,[t,n])=>(e["["+t]=_u("["+t,n),e),{});function _u(e,t){let n=b.prototype,r=Eu(t),o={typeName:t,newArray:n["new"+r+"Array"],setRegion:n["set"+r+"ArrayRegion"],getElements:n["get"+r+"ArrayElements"],releaseElements:n["release"+r+"ArrayElements"]};return{name:e,type:"pointer",size:1,defaultValue:NULL,isCompatible(i){return yu(i,t)},fromJni(i,s,l){return gu(i,o,s,l)},toJni(i,s){return bu(i,o,s)}}}function ir(e,t,n){let r=fu[e];if(r!==void 0)return r;if(e.indexOf("[")!==0)throw Error("Unsupported type: "+e);let o=e.substring(1),i=or(o,t,n),s=0,l=o.length;while(s!==l&&o[s]==="[")s++;if(o=o.substring(s),o[0]==="L"&&o[o.length-1]===";")o=o.substring(1,o.length-1);let a=o.replace(/\./g,"/");if(du.has(a))a="[".repeat(s)+a;else a="[".repeat(s)+"L"+a+";";let c="["+a;return o="[".repeat(s)+o,{name:e.replace(/\./g,"/"),type:"pointer",size:1,defaultValue:NULL,isCompatible(d){if(d===null)return!0;if(typeof d!=="object"||d.length===void 0)return!1;return d.every(function(p){return i.isCompatible(p)})},fromJni(d,p,u){if(d.isNull())return null;let h=[],_=p.getArrayLength(d);for(let f=0;f!==_;f++){let m=p.getObjectArrayElement(d,f);try{h.push(i.fromJni(m,p))}finally{p.deleteLocalRef(m)}}try{h.$w=n.cast(d,n.use(c),u)}catch(f){n.use("java.lang.reflect.Array").newInstance(n.use(o).class,0),h.$w=n.cast(d,n.use(c),u)}return h.$dispose=mu,h},toJni(d,p){if(d===null)return NULL;if(!(d instanceof Array))throw Error("Expected an array");let u=d.$w;if(u!==void 0)return u.$h;let h=d.length,f=n.use(o).$borrowClassHandle(p);try{let m=p.newObjectArray(h,f.value,NULL);p.throwIfExceptionPending();for(let y=0;y!==h;y++){let E=i.toJni(d[y],p);try{p.setObjectArrayElement(m,y,E)}finally{if(i.type==="pointer"&&p.getObjectRefType(E)===cu)p.deleteLocalRef(E)}p.throwIfExceptionPending()}return m}finally{f.unref(p)}}}}function mu(){let e=this.length;for(let t=0;t!==e;t++){let n=this[t];if(n===null)continue;let r=n.$dispose;if(r===void 0)break;r.call(n)}this.$w.$dispose()}function gu(e,t,n,r){if(e.isNull())return null;let o=Xe(t.typeName),i=n.getArrayLength(e);return new Dt(e,t,o,i,n,r)}function bu(e,t,n){if(e===null)return NULL;let r=e.$h;if(r!==void 0)return r;let o=e.length,i=Xe(t.typeName),s=t.newArray.call(n,o);if(s.isNull())throw Error("Unable to construct array");if(o>0){let{byteSize:l,write:a,toJni:c}=i,d=Memory.alloc(o*i.byteSize);for(let p=0;p!==o;p++)a(d.add(p*l),c(e[p]));t.setRegion.call(n,s,0,o,d),n.throwIfExceptionPending()}return s}function yu(e,t){if(e===null)return!0;if(e instanceof Dt)return e.$s.typeName===t;if(!(typeof e==="object"&&e.length!==void 0))return!1;let r=Xe(t);return Array.prototype.every.call(e,(o)=>r.isCompatible(o))}function Dt(e,t,n,r,o,i=!0){if(i){let s=o.newGlobalRef(e);this.$h=s,this.$r=Script.bindWeak(this,o.vm.makeHandleDestructor(s))}else this.$h=e,this.$r=null;return this.$s=t,this.$t=n,this.length=r,new Proxy(this,Xo)}Xo={has(e,t){if(t in e)return!0;return e.tryParseIndex(t)!==null},get(e,t,n){let r=e.tryParseIndex(t);if(r===null)return e[t];return e.readElement(r)},set(e,t,n,r){let o=e.tryParseIndex(t);if(o===null)return e[t]=n,!0;return e.writeElement(o,n),!0},ownKeys(e){let t=[],{length:n}=e;for(let r=0;r!==n;r++){let o=r.toString();t.push(o)}return t.push("length"),t},getOwnPropertyDescriptor(e,t){if(e.tryParseIndex(t)!==null)return{writable:!0,configurable:!0,enumerable:!0};return Object.getOwnPropertyDescriptor(e,t)}};Object.defineProperties(Dt.prototype,{$dispose:{enumerable:!0,value(){let e=this.$r;if(e!==null)this.$r=null,Script.unbindWeak(e)}},$clone:{value(e){return new Dt(this.$h,this.$s,this.$t,this.length,e)}},tryParseIndex:{value(e){if(typeof e==="symbol")return null;let t=parseInt(e);if(isNaN(t)||t<0||t>=this.length)return null;return t}},readElement:{value(e){return this.withElements((t)=>{let n=this.$t;return n.fromJni(n.read(t.add(e*n.byteSize)))})}},writeElement:{value(e,t){let{$h:n,$s:r,$t:o}=this,i=rr.getEnv(),s=Memory.alloc(o.byteSize);o.write(s,o.toJni(t)),r.setRegion.call(i,n,e,1,s)}},withElements:{value(e){let{$h:t,$s:n}=this,r=rr.getEnv(),o=n.getElements.call(r,t);if(o.isNull())throw Error("Unable to get array elements");try{return e(o)}finally{n.releaseElements.call(r,t,o)}}},toJSON:{value(){let{length:e,$t:t}=this,{byteSize:n,fromJni:r,read:o}=t;return this.withElements((i)=>{let s=[];for(let l=0;l!==e;l++){let a=r(o(i.add(l*n)));s.push(a)}return s})}},toString:{value(){return this.toJSON().toString()}}});function Ge(e){return"L"+e.replace(/\./g,"/")+";"}function Eu(e){return e.charAt(0).toUpperCase()+e.slice(1)}function Ee(e){return e}var vu=4,{ensureClassInitialized:ti,makeMethodMangler:ai}=jt,Su=8,lr=1,mt=2,Me=3,sr=1,cr=2,Ut=1,li=2,ni=Symbol("PENDING_USE"),ri="/data/local/tmp",{getCurrentThreadId:Vt,pointerSize:_t}=Process,de={state:"empty",factories:[],loaders:null,Integer:null},G=null,Y=null,ci=null,di=null,ui=null,pi=null,hi=null,oi=null,ar=null,et=new Map;class Re{static _initialize(e,t){if(G=e,Y=t,ci=t.flavor==="art",t.flavor==="jvm")ti=ho,ai=mo}static _disposeAll(e){de.factories.forEach((t)=>{t._dispose(e)})}static get(e){let t=Bu(),n=t.factories[0];if(e===null)return n;let r=t.loaders.get(e);if(r!==null){let i=n.cast(r,t.Integer);return t.factories[i.intValue()]}let o=new Re;return o.loader=e,o.cacheDir=n.cacheDir,pr(o,e),o}constructor(){this.cacheDir=ri,this.codeCacheDir=ri+"/dalvik-cache",this.tempFileNaming={prefix:"frida",suffix:""},this._classes={},this._classHandles=new Rt(10,Iu),this._patchedMethods=new Set,this._loader=null,this._types=[{},{}],de.factories.push(this)}_dispose(e){Array.from(this._patchedMethods).forEach((t)=>{t.implementation=null}),this._patchedMethods.clear(),xn(),this._classHandles.dispose(e),this._classes={}}get loader(){return this._loader}set loader(e){let t=this._loader===null&&e!==null;if(this._loader=e,t&&de.state==="ready"&&this===de.factories[0])pr(this,e)}use(e,t={}){let n=t.cache!=="skip",r=n?this._getUsedClass(e):void 0;if(r===void 0)try{let o=G.getEnv(),{_loader:i}=this,s=i!==null?Tu(e,i,o):Cu(e);r=this._make(e,s,o)}finally{if(n)this._setUsedClass(e,r)}return r}_getUsedClass(e){let t;while((t=this._classes[e])===ni)Thread.sleep(0.05);if(t===void 0)this._classes[e]=ni;return t}_setUsedClass(e,t){if(t!==void 0)this._classes[e]=t;else delete this._classes[e]}_make(e,t,n){let r=wu(),o=Object.create(fr.prototype,{[Symbol.for("n")]:{value:e},$n:{get(){return this[Symbol.for("n")]}},[Symbol.for("C")]:{value:r},$C:{get(){return this[Symbol.for("C")]}},[Symbol.for("w")]:{value:null,writable:!0},$w:{get(){return this[Symbol.for("w")]},set(l){this[Symbol.for("w")]=l}},[Symbol.for("_s")]:{writable:!0},$_s:{get(){return this[Symbol.for("_s")]},set(l){this[Symbol.for("_s")]=l}},[Symbol.for("c")]:{value:[null]},$c:{get(){return this[Symbol.for("c")]}},[Symbol.for("m")]:{value:new Map},$m:{get(){return this[Symbol.for("m")]}},[Symbol.for("l")]:{value:null,writable:!0},$l:{get(){return this[Symbol.for("l")]},set(l){this[Symbol.for("l")]=l}},[Symbol.for("gch")]:{value:t},$gch:{get(){return this[Symbol.for("gch")]}},[Symbol.for("f")]:{value:this},$f:{get(){return this[Symbol.for("f")]}}});r.prototype=o;let i=new r(null);o[Symbol.for("w")]=i,o.$w=i;let s=i.$borrowClassHandle(n);try{let l=s.value;ti(n,l),o.$l=Ve.build(l,n)}finally{s.unref(n)}return i}retain(e){let t=G.getEnv();return e.$clone(t)}cast(e,t,n){let r=G.getEnv(),o=e.$h;if(o===void 0)o=e;let i=t.$borrowClassHandle(r);try{if(!r.isInstanceOf(o,i.value))throw Error(`Cast from '${r.getObjectClassName(o)}' to '${t.$n}' isn't possible`)}finally{i.unref(r)}return new t.$C(o,Ut,r,n)}wrap(e,t,n){let o=new t.$C(e,Ut,n,!1);return o.$r=Script.bindWeak(o,G.makeHandleDestructor(e)),o}array(e,t){let n=G.getEnv(),r=Xe(e);if(r!==null)e=r.name;let o=ir("["+e,!1,this),i=o.toJni(t,n);return o.fromJni(i,n,!0)}registerClass(e){let t=G.getEnv(),n=[];try{let r=this.use("java.lang.Class"),o=t.javaLangReflectMethod(),i=t.vaMethod("pointer",[]),s=e.name,l=e.implements||[],a=e.superClass||this.use("java.lang.Object"),c=[],d=[],p={name:Ge(s),sourceFileName:Gu(s),superClass:Ge(a.$n),interfaces:l.map((v)=>Ge(v.$n)),fields:c,methods:d},u=l.slice();l.forEach((v)=>{Array.prototype.slice.call(v.class.getInterfaces()).forEach((L)=>{let S=this.cast(L,r).getCanonicalName();u.push(this.use(S))})});let h=e.fields||{};Object.getOwnPropertyNames(h).forEach((v)=>{let L=this._getType(h[v]);c.push([v,L.name])});let _={},f={};u.forEach((v)=>{let L=v.$borrowClassHandle(t);n.push(L);let S=L.value;v.$ownMembers.filter((x)=>v[x].overloads!==void 0).forEach((x)=>{let I=v[x],P=I.overloads,F=P.map((z)=>ii(x,z.returnType,z.argumentTypes));_[x]=[I,F,S],P.forEach((z,D)=>{let V=F[D];f[V]=[z,S]})})});let m=e.methods||{},E=Object.keys(m).reduce((v,L)=>{let S=m[L],x=L==="$init"?"<init>":L;if(S instanceof Array)v.push(...S.map((I)=>[x,I]));else v.push([x,S]);return v},[]),k=[];E.forEach(([v,L])=>{let S=Me,x,I,P=[],F;if(typeof L==="function"){let Z=_[v];if(Z!==void 0&&Array.isArray(Z)){let[le,W,ae]=Z;if(W.length>1)throw Error(`More than one overload matching '${v}': signature must be specified`);delete f[W[0]];let ne=le.overloads[0];S=ne.type,x=ne.returnType,I=ne.argumentTypes,F=L;let te=t.toReflectedMethod(ae,ne.handle,0),_e=i(t.handle,te,o.getGenericExceptionTypes);P=hr(t,_e).map(Ge),t.deleteLocalRef(_e),t.deleteLocalRef(te)}else x=this._getType("void"),I=[],F=L}else{if(L.isStatic)S=mt;if(x=this._getType(L.returnType||"void"),I=(L.argumentTypes||[]).map((W)=>this._getType(W)),F=L.implementation,typeof F!=="function")throw Error("Expected a function implementation for method: "+v);let Z=ii(v,x,I),le=f[Z];if(le!==void 0){let[W,ae]=le;delete f[Z],S=W.type,x=W.returnType,I=W.argumentTypes;let ne=t.toReflectedMethod(ae,W.handle,0),te=i(t.handle,ne,o.getGenericExceptionTypes);P=hr(t,te).map(Ge),t.deleteLocalRef(te),t.deleteLocalRef(ne)}}let z=x.name,D=I.map((Z)=>Z.name),V="("+D.join("")+")"+z;d.push([v,z,D,P,S===mt?Su:0]),k.push([v,V,S,x,I,F])});let T=Object.keys(f);if(T.length>0)throw Error("Missing implementation for: "+T.join(", "));let O=zt.fromBuffer(Qo(p),this);try{O.load()}finally{O.file.delete()}let M=this.use(e.name),j=E.length;if(j>0){let v=3*_t,L=Memory.alloc(j*v),S=[],x=[];k.forEach(([F,z,D,V,Z,le],W)=>{let ae=Memory.allocUtf8String(F),ne=Memory.allocUtf8String(z),te=fi(F,M,D,V,Z,le);L.add(W*v).writePointer(ae),L.add(W*v+_t).writePointer(ne),L.add(W*v+2*_t).writePointer(te),x.push(ae,ne),S.push(te)});let I=M.$borrowClassHandle(t);n.push(I);let P=I.value;t.registerNatives(P,L,j),t.throwIfExceptionPending(),M.$nativeMethods=S}return M}finally{n.forEach((r)=>{r.unref(t)})}}choose(e,t){let n=G.getEnv(),{flavor:r}=Y;if(r==="jvm")this._chooseObjectsJvm(e,n,t);else if(r==="art"){let o=Y["art::gc::Heap::VisitObjects"]===void 0;if(o){if(Y["art::gc::Heap::GetInstances"]===void 0)return this._chooseObjectsJvm(e,n,t)}he(G,n,(i)=>{if(o)this._chooseObjectsArtPreA12(e,n,i,t);else this._chooseObjectsArtLegacy(e,n,i,t)})}else this._chooseObjectsDalvik(e,n,t)}_chooseObjectsJvm(e,t,n){let r=this.use(e),{jvmti:o}=Y,i=1,s=3,l=r.$borrowClassHandle(t),a=int64(l.value.toString());try{let c=new NativeCallback((m,y,E,k)=>(E.writeS64(a),1),"int",["int64","int64","pointer","pointer"]);o.iterateOverInstancesOfClass(l.value,3,c,l.value);let d=Memory.alloc(8);d.writeS64(a);let p=Memory.alloc(vu),u=Memory.alloc(_t);o.getObjectsWithTags(1,d,p,u,NULL);let h=p.readS32(),_=u.readPointer(),f=[];for(let m=0;m!==h;m++)f.push(_.add(m*_t).readPointer());o.deallocate(_);try{for(let m of f){let y=this.cast(m,r);if(n.onMatch(y)==="stop")break}n.onComplete()}finally{f.forEach((m)=>{t.deleteLocalRef(m)})}}finally{l.unref(t)}}_chooseObjectsArtPreA12(e,t,n,r){let o=this.use(e),i=dt.$new(n,G),s,l=o.$borrowClassHandle(t);try{let p=Y["art::JavaVMExt::DecodeGlobal"](Y.vm,n,l.value);s=i.newHandle(p)}finally{l.unref(t)}let a=0,c=ct.$new();Y["art::gc::Heap::GetInstances"](Y.artHeap,i,s,a,c);let d=c.handles.map((p)=>t.newGlobalRef(p));c.$delete(),i.$delete();try{for(let p of d){let u=this.cast(p,o);if(r.onMatch(u)==="stop")break}r.onComplete()}finally{d.forEach((p)=>{t.deleteGlobalRef(p)})}}_chooseObjectsArtLegacy(e,t,n,r){let o=this.use(e),i=[],s=Y["art::JavaVMExt::AddGlobalRef"],l=Y.vm,a,c=o.$borrowClassHandle(t);try{a=Y["art::JavaVMExt::DecodeGlobal"](l,n,c.value).toInt32()}finally{c.unref(t)}let d=Vn(a,(p)=>{i.push(s(l,n,p))});Y["art::gc::Heap::VisitObjects"](Y.artHeap,d,NULL);try{for(let p of i){let u=this.cast(p,o);if(r.onMatch(u)==="stop")break}}finally{i.forEach((p)=>{t.deleteGlobalRef(p)})}r.onComplete()}_chooseObjectsDalvik(e,t,n){let r=this.use(e);if(Y.addLocalReference===null){let i=Process.getModuleByName("libdvm.so"),s;switch(Process.arch){case"arm":s="2d e9 f0 41 05 46 15 4e 0c 46 7e 44 11 b3 43 68";break;case"ia32":s="8d 64 24 d4 89 5c 24 1c 89 74 24 20 e8 ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? 85 d2";break}Memory.scan(i.base,i.size,s,{onMatch:(l,a)=>{let c;if(Process.arch==="arm")l=l.or(1),c=new NativeFunction(l,"pointer",["pointer","pointer"]);else{let d=Memory.alloc(Process.pageSize);Memory.patchCode(d,16,(p)=>{let u=new X86Writer(p,{pc:d});u.putMovRegRegOffsetPtr("eax","esp",4),u.putMovRegRegOffsetPtr("edx","esp",8),u.putJmpAddress(l),u.flush()}),c=new NativeFunction(d,"pointer",["pointer","pointer"]),c._thunk=d}return Y.addLocalReference=c,G.perform((d)=>{o(this,d)}),"stop"},onError(l){},onComplete(){if(Y.addLocalReference===null)n.onComplete()}})}else o(this,t);function o(i,s){let{DVM_JNI_ENV_OFFSET_SELF:l}=jt,a=s.handle.add(l).readPointer(),c,d=r.$borrowClassHandle(s);try{c=Y.dvmDecodeIndirectRef(a,d.value)}finally{d.unref(s)}let p=c.toMatchPattern(),u=Y.dvmHeapSourceGetBase(),_=Y.dvmHeapSourceGetLimit().sub(u).toInt32();Memory.scan(u,_,p,{onMatch:(f,m)=>{if(Y.dvmIsValidObject(f))G.perform((y)=>{let E=y.handle.add(l).readPointer(),k,T=Y.addLocalReference(E,f);try{k=i.cast(T,r)}finally{y.deleteLocalRef(T)}if(n.onMatch(k)==="stop")return"stop"})},onError(f){},onComplete(){n.onComplete()}})}}openClassFile(e){return new zt(e,null,this)}_getType(e,t=!0){return or(e,t,this)}}function wu(){return function(e,t,n,r){return fr.call(this,e,t,n,r)}}function fr(e,t,n,r=!0){if(e!==null)if(r){let o=n.newGlobalRef(e);this.$h=o,this.$r=Script.bindWeak(this,G.makeHandleDestructor(o))}else this.$h=e,this.$r=null;else this.$h=null,this.$r=null;return this.$t=t,new Proxy(this,di)}di={has(e,t){if(t in e)return!0;return e.$has(t)},get(e,t,n){if(typeof t!=="string"||t.startsWith("$")||t==="class")return e[t];let r=e.$find(t);if(r!==null)return r(n);return e[t]},set(e,t,n,r){return e[t]=n,!0},ownKeys(e){return e.$list()},getOwnPropertyDescriptor(e,t){if(Object.prototype.hasOwnProperty.call(e,t))return Object.getOwnPropertyDescriptor(e,t);return{writable:!1,configurable:!0,enumerable:!0}}};Object.defineProperties(fr.prototype,{[Symbol.for("new")]:{enumerable:!1,get(){return this.$getCtor("allocAndInit")}},$new:{enumerable:!0,get(){return this[Symbol.for("new")]}},[Symbol.for("alloc")]:{enumerable:!1,value(){let e=G.getEnv(),t=this.$borrowClassHandle(e);try{let n=e.allocObject(t.value);return this.$f.cast(n,this)}finally{t.unref(e)}}},$alloc:{enumerable:!0,get(){return this[Symbol.for("alloc")]}},[Symbol.for("init")]:{enumerable:!1,get(){return this.$getCtor("initOnly")}},$init:{enumerable:!0,get(){return this[Symbol.for("init")]}},[Symbol.for("dispose")]:{enumerable:!1,value(){let e=this.$r;if(e!==null)this.$r=null,Script.unbindWeak(e);if(this.$h!==null)this.$h=void 0}},$dispose:{enumerable:!0,get(){return this[Symbol.for("dispose")]}},[Symbol.for("clone")]:{enumerable:!1,value(e){return new this.$C(this.$h,this.$t,e)}},$clone:{value(e){return this[Symbol.for("clone")](e)}},[Symbol.for("class")]:{enumerable:!1,get(){let e=G.getEnv(),t=this.$borrowClassHandle(e);try{let n=this.$f;return n.cast(t.value,n.use("java.lang.Class"))}finally{t.unref(e)}}},class:{enumerable:!0,get(){return this[Symbol.for("class")]}},[Symbol.for("className")]:{enumerable:!1,get(){let e=this.$h;if(e===null)return this.$n;return G.getEnv().getObjectClassName(e)}},$className:{enumerable:!0,get(){return this[Symbol.for("className")]}},[Symbol.for("ownMembers")]:{enumerable:!1,get(){return this.$l.list()}},$ownMembers:{enumerable:!0,get(){return this[Symbol.for("ownMembers")]}},[Symbol.for("super")]:{enumerable:!1,get(){let e=G.getEnv();return new this.$s.$C(this.$h,li,e)}},$super:{enumerable:!0,get(){return this[Symbol.for("super")]}},[Symbol.for("s")]:{enumerable:!1,get(){let e=Object.getPrototypeOf(this),t=e.$_s;if(t===void 0){let n=G.getEnv(),r=this.$borrowClassHandle(n);try{let o=n.getSuperclass(r.value);if(!o.isNull())try{let i=n.getClassName(o),s=e.$f;if(t=s._getUsedClass(i),t===void 0)try{let l=Au(this);t=s._make(i,l,n)}finally{s._setUsedClass(i,t)}}finally{n.deleteLocalRef(o)}else t=null}finally{r.unref(n)}e.$_s=t}return t}},$s:{get(){return this[Symbol.for("s")]}},[Symbol.for("isSameObject")]:{enumerable:!1,value(e){return G.getEnv().isSameObject(e.$h,this.$h)}},$isSameObject:{value(e){return this[Symbol.for("isSameObject")](e)}},[Symbol.for("getCtor")]:{enumerable:!1,value(e){let t=this.$c,n=t[0];if(n===null){let r=G.getEnv(),o=this.$borrowClassHandle(r);try{n=Nu(o.value,this.$w,r),t[0]=n}finally{o.unref(r)}}return n[e]}},$getCtor:{value(e){return this[Symbol.for("getCtor")](e)}},[Symbol.for("borrowClassHandle")]:{enumerable:!1,value(e){let t=this.$n,n=this.$f._classHandles,r=n.get(t);if(r===void 0)r=new _r(this.$gch(e),e),n.set(t,r,e);return r.ref()}},$borrowClassHandle:{value(e){return this[Symbol.for("borrowClassHandle")](e)}},[Symbol.for("copyClassHandle")]:{enumerable:!1,value(e){let t=this.$borrowClassHandle(e);try{return e.newLocalRef(t.value)}finally{t.unref(e)}}},$copyClassHandle:{value(e){return this[Symbol.for("copyClassHandle")](e)}},[Symbol.for("getHandle")]:{enumerable:!1,value(e){let t=this.$h;if(t===void 0)throw Error("Wrapper is disposed; perhaps it was borrowed from a hook instead of calling Java.retain() to make a long-lived wrapper?");return t}},$getHandle:{value(e){return this[Symbol.for("getHandle")](e)}},[Symbol.for("list")]:{enumerable:!1,value(){let e=this.$s,t=e!==null?e.$list():[],n=this.$l;return Array.from(new Set(t.concat(n.list())))}},$list:{get(){return this[Symbol.for("list")]}},[Symbol.for("has")]:{enumerable:!1,value(e){if(this.$m.has(e))return!0;if(this.$l.has(e))return!0;let r=this.$s;if(r!==null&&r.$has(e))return!0;return!1}},$has:{value(e){return this[Symbol.for("has")](e)}},[Symbol.for("find")]:{enumerable:!1,value(e){let t=this.$m,n=t.get(e);if(n!==void 0)return n;let o=this.$l.find(e);if(o!==null){let s=G.getEnv(),l=this.$borrowClassHandle(s);try{n=Lu(e,o,l.value,this.$w,s)}finally{l.unref(s)}return t.set(e,n),n}let i=this.$s;if(i!==null)return i.$find(e);return null}},$find:{value(e){return this[Symbol.for("find")](e)}},[Symbol.for("toJSON")]:{enumerable:!1,value(){let e=this.$n;if(this.$h===null)return`<class: ${e}>`;let n=this.$className;if(e===n)return`<instance: ${e}>`;return`<instance: ${e}, $className: ${n}>`}},toJSON:{get(){return this[Symbol.for("toJSON")]}}});function _r(e,t){this.value=t.newGlobalRef(e),t.deleteLocalRef(e),this.refs=1}_r.prototype.ref=function(){return this.refs++,this};_r.prototype.unref=function(e){if(--this.refs===0)e.deleteGlobalRef(this.value)};function Iu(e,t){e.unref(t)}function Cu(e){let t=e.replace(/\./g,"/");return function(n){let r=Vt();mi(r);try{return n.findClass(t)}finally{gi(r)}}}function Tu(e,t,n){if(ar===null)oi=n.vaMethod("pointer",["pointer"]),ar=t.loadClass.overload("java.lang.String").handle;return n=null,function(r){let o=r.newStringUtf(e),i=Vt();mi(i);try{let s=oi(r.handle,t.$h,ar,o);return r.throwIfExceptionPending(),s}finally{gi(i),r.deleteLocalRef(o)}}}function Au(e){return function(t){let n=e.$borrowClassHandle(t);try{return t.getSuperclass(n.value)}finally{n.unref(t)}}}function Nu(e,t,n){let{$n:r,$f:o}=t,i=Ju(r),s=n.javaLangClass(),l=n.javaLangReflectConstructor(),a=n.vaMethod("pointer",[]),c=n.vaMethod("uint8",[]),d=[],p=[],u=o._getType(r,!1),h=o._getType("void",!1),_=a(n.handle,e,s.getDeclaredConstructors);try{let f=n.getArrayLength(_);if(f!==0)for(let m=0;m!==f;m++){let y,E,k=n.getObjectArrayElement(_,m);try{y=n.fromReflectedMethod(k),E=a(n.handle,k,l.getGenericParameterTypes)}finally{n.deleteLocalRef(k)}let T;try{T=hr(n,E).map((O)=>o._getType(O))}finally{n.deleteLocalRef(E)}d.push(Ye(i,t,lr,y,u,T,n)),p.push(Ye(i,t,Me,y,h,T,n))}else{if(c(n.handle,e,s.isInterface))throw Error("cannot instantiate an interface");let y=n.javaLangObject(),E=n.getMethodId(y,"<init>","()V");d.push(Ye(i,t,lr,E,u,[],n)),p.push(Ye(i,t,Me,E,h,[],n))}}finally{n.deleteLocalRef(_)}if(p.length===0)throw Error("no supported overloads");return{allocAndInit:dr(d),initOnly:dr(p)}}function Lu(e,t,n,r,o){if(t.startsWith("m"))return Mu(e,t,n,r,o);return Uu(e,t,n,r,o)}function Mu(e,t,n,r,o){let{$f:i}=r,s=t.split(":").slice(1),l=o.javaLangReflectMethod(),a=o.vaMethod("pointer",[]),c=o.vaMethod("uint8",[]),d=s.map((u)=>{let h=u[0]==="s"?mt:Me,_=ptr(u.substr(1)),f,m=[],y=o.toReflectedMethod(n,_,h===mt?1:0);try{let E=!!c(o.handle,y,l.isVarArgs),k=a(o.handle,y,l.getGenericReturnType);o.throwIfExceptionPending();try{f=i._getType(o.getTypeName(k))}finally{o.deleteLocalRef(k)}let T=a(o.handle,y,l.getParameterTypes);try{let O=o.getArrayLength(T);for(let M=0;M!==O;M++){let j=o.getObjectArrayElement(T,M),v;try{v=E&&M===O-1?o.getArrayTypeName(j):o.getTypeName(j)}finally{o.deleteLocalRef(j)}let L=i._getType(v);m.push(L)}}finally{o.deleteLocalRef(T)}}catch(E){return null}finally{o.deleteLocalRef(y)}return Ye(e,r,h,_,f,m,o)}).filter((u)=>u!==null);if(d.length===0)throw Error("No supported overloads");if(e==="valueOf")Pu(d);let p=dr(d);return function(u){return p}}function dr(e){let t=ku();return Object.setPrototypeOf(t,ui),t._o=e,t}function ku(){let e=function(){return e.invoke(this,arguments)};return e}ui=Object.create(Function.prototype,{overloads:{enumerable:!0,get(){return this._o}},overload:{value(...e){let t=this._o,n=e.length,r=e.join(":");for(let o=0;o!==t.length;o++){let i=t[o],{argumentTypes:s}=i;if(s.length!==n)continue;if(s.map((a)=>a.className).join(":")===r)return i}ur(this.methodName,this.overloads,"specified argument types do not match any of:")}},methodName:{enumerable:!0,get(){return this._o[0].methodName}},holder:{enumerable:!0,get(){return this._o[0].holder}},type:{enumerable:!0,get(){return this._o[0].type}},handle:{enumerable:!0,get(){return $e(this),this._o[0].handle}},implementation:{enumerable:!0,get(){return $e(this),this._o[0].implementation},set(e){$e(this),this._o[0].implementation=e}},returnType:{enumerable:!0,get(){return $e(this),this._o[0].returnType}},argumentTypes:{enumerable:!0,get(){return $e(this),this._o[0].argumentTypes}},canInvokeWith:{enumerable:!0,get(e){return $e(this),this._o[0].canInvokeWith}},clone:{enumerable:!0,value(e){return $e(this),this._o[0].clone(e)}},invoke:{value(e,t){let n=this._o,r=e.$h!==null;for(let o=0;o!==n.length;o++){let i=n[o];if(!i.canInvokeWith(t))continue;if(i.type===Me&&!r){let s=this.methodName;if(s==="toString")return`<class: ${e.$n}>`;throw Error(s+": cannot call instance method without an instance")}return i.apply(e,t)}if(this.methodName==="toString")return`<class: ${e.$n}>`;ur(this.methodName,this.overloads,"argument types do not match any of:")}}});function ii(e,t,n){return`${t.className} ${e}(${n.map((r)=>r.className).join(", ")})`}function $e(e){let t=e._o;if(t.length>1)ur(t[0].methodName,t,"has more than one overload, use .overload(<signature>) to choose from:")}function ur(e,t,n){let o=t.slice().sort((i,s)=>i.argumentTypes.length-s.argumentTypes.length).map((i)=>{if(i.argumentTypes.length>0)return".overload('"+i.argumentTypes.map((l)=>l.className).join("', '")+"')";else return".overload()"});throw Error(`${e}(): ${n}
	${o.join(`
	`)}`)}function Ye(e,t,n,r,o,i,s,l){let a=o.type,c=i.map((u)=>u.type);if(s===null)s=G.getEnv();let d,p;if(n===Me)d=s.vaMethod(a,c,l),p=s.nonvirtualVaMethod(a,c,l);else if(n===mt)d=s.staticVaMethod(a,c,l),p=d;else d=s.constructor(c,l),p=d;return xu([e,t,n,r,o,i,d,p])}function xu(e){let t=ju();return Object.setPrototypeOf(t,pi),t._p=e,t}function ju(){let e=function(){return e.invoke(this,arguments)};return e}pi=Object.create(Function.prototype,{methodName:{enumerable:!0,get(){return this._p[0]}},holder:{enumerable:!0,get(){return this._p[1]}},type:{enumerable:!0,get(){return this._p[2]}},handle:{enumerable:!0,get(){return this._p[3]}},implementation:{enumerable:!0,get(){let e=this._r;return e!==void 0?e:null},set(e){let t=this._p,n=t[1];if(t[2]===lr)throw Error("Reimplementing $new is not possible; replace implementation of $init instead");let o=this._r;if(o!==void 0)n.$f._patchedMethods.delete(this),o._m.revert(G),this._r=void 0;if(e!==null){let[i,s,l,a,c,d]=t,p=fi(i,s,l,c,d,e,this),u=ai(a);p._m=u,this._r=p,u.replace(p,l===Me,d,G,Y),n.$f._patchedMethods.add(this)}}},returnType:{enumerable:!0,get(){return this._p[4]}},argumentTypes:{enumerable:!0,get(){return this._p[5]}},canInvokeWith:{enumerable:!0,value(e){let t=this._p[5];if(e.length!==t.length)return!1;return t.every((n,r)=>n.isCompatible(e[r]))}},clone:{enumerable:!0,value(e){let t=this._p.slice(0,6);return Ye(...t,null,e)}},invoke:{value(e,t){let n=G.getEnv(),r=this._p,o=r[2],i=r[4],s=r[5],l=this._r,a=o===Me,c=t.length,d=2+c;n.pushLocalFrame(d);let p=null;try{let u;if(a)u=e.$getHandle();else p=e.$borrowClassHandle(n),u=p.value;let h,_=e.$t;if(l===void 0)h=r[3];else if(h=l._m.resolveTarget(e,a,n,Y),ci){if(l._c.has(Vt()))_=li}let f=[n.handle,u,h];for(let E=0;E!==c;E++)f.push(s[E].toJni(t[E],n));let m;if(_===Ut)m=r[6];else if(m=r[7],a)f.splice(2,0,e.$copyClassHandle(n));let y=m.apply(null,f);return n.throwIfExceptionPending(),i.fromJni(y,n,!0)}finally{if(p!==null)p.unref(n);n.popLocalFrame(NULL)}}},toString:{enumerable:!0,value(){return`function ${this.methodName}(${this.argumentTypes.map((e)=>e.className).join(", ")}): ${this.returnType.className}`}}});function fi(e,t,n,r,o,i,s=null){let l=new Set,a=Ou([e,t,n,r,o,i,s,l]),c=new NativeCallback(a,r.type,["pointer","pointer"].concat(o.map((d)=>d.type)));return c._c=l,c}function Ou(e){return function(){return Ru(arguments,e)}}function Ru(e,t){let n=new b(e[0],G),[r,o,i,s,l,a,c,d]=t,p=[],u;if(i===Me)u=new o.$C(e[1],Ut,n,!1);else u=o;let h=Vt();n.pushLocalFrame(3);let _=!0;G.link(h,n);try{d.add(h);let f;if(c===null||!et.has(h))f=a;else f=c;let m=[],y=e.length-2;for(let T=0;T!==y;T++){let M=l[T].fromJni(e[2+T],n,!1);m.push(M),p.push(M)}let E=f.apply(u,m);if(!s.isCompatible(E))throw Error(`Implementation for ${r} expected return value compatible with ${s.className}`);let k=s.toJni(E,n);if(s.type==="pointer")k=n.popLocalFrame(k),_=!1,p.push(E);return k}catch(f){let m=f.$h;if(m!==void 0)n.throw(m);else Script.nextTick(()=>{throw f});return s.defaultValue}finally{if(G.unlink(h),_)n.popLocalFrame(NULL);d.delete(h),p.forEach((f)=>{if(f===null)return;let m=f.$dispose;if(m!==void 0)m.call(f)})}}function Pu(e){let{holder:t,type:n}=e[0];if(e.some((o)=>o.type===n&&o.argumentTypes.length===0))return;e.push(Fu([t,n]))}function Fu(e){let t=Du();return Object.setPrototypeOf(t,hi),t._p=e,t}function Du(){return function(){return this}}hi=Object.create(Function.prototype,{methodName:{enumerable:!0,get(){return"valueOf"}},holder:{enumerable:!0,get(){return this._p[0]}},type:{enumerable:!0,get(){return this._p[1]}},handle:{enumerable:!0,get(){return NULL}},implementation:{enumerable:!0,get(){return null},set(e){}},returnType:{enumerable:!0,get(){let e=this.holder;return e.$f.use(e.$n)}},argumentTypes:{enumerable:!0,get(){return[]}},canInvokeWith:{enumerable:!0,value(e){return e.length===0}},clone:{enumerable:!0,value(e){throw Error("Invalid operation")}}});function Uu(e,t,n,r,o){let i=t[2]==="s"?sr:cr,s=ptr(t.substr(3)),{$f:l}=r,a,c=o.toReflectedField(n,s,i===sr?1:0);try{a=o.vaMethod("pointer",[])(o.handle,c,o.javaLangReflectField().getGenericType),o.throwIfExceptionPending()}finally{o.deleteLocalRef(c)}let d;try{d=l._getType(o.getTypeName(a))}finally{o.deleteLocalRef(a)}let p,u,h=d.type;if(i===sr)p=o.getStaticField(h),u=o.setStaticField(h);else p=o.getField(h),u=o.setField(h);return zu([i,d,s,p,u])}function zu(e){return function(t){return new _i([t].concat(e))}}function _i(e){this._p=e}Object.defineProperties(_i.prototype,{value:{enumerable:!0,get(){let[e,t,n,r,o]=this._p,i=G.getEnv();i.pushLocalFrame(4);let s=null;try{let l;if(t===cr){if(l=e.$getHandle(),l===null)throw Error("Cannot access an instance field without an instance")}else s=e.$borrowClassHandle(i),l=s.value;let a=o(i.handle,l,r);return i.throwIfExceptionPending(),n.fromJni(a,i,!0)}finally{if(s!==null)s.unref(i);i.popLocalFrame(NULL)}},set(e){let[t,n,r,o,,i]=this._p,s=G.getEnv();s.pushLocalFrame(4);let l=null;try{let a;if(n===cr){if(a=t.$getHandle(),a===null)throw Error("Cannot access an instance field without an instance")}else l=t.$borrowClassHandle(s),a=l.value;if(!r.isCompatible(e))throw Error(`Expected value compatible with ${r.className}`);let c=r.toJni(e,s);i(s.handle,a,o,c),s.throwIfExceptionPending()}finally{if(l!==null)l.unref(s);s.popLocalFrame(NULL)}}},holder:{enumerable:!0,get(){return this._p[0]}},fieldType:{enumerable:!0,get(){return this._p[1]}},fieldReturnType:{enumerable:!0,get(){return this._p[2]}},toString:{enumerable:!0,value(){let e=`Java.Field{holder: ${this.holder}, fieldType: ${this.fieldType}, fieldReturnType: ${this.fieldReturnType}, value: ${this.value}}`;if(e.length<200)return e;return`Java.Field{
	holder: ${this.holder},
	fieldType: ${this.fieldType},
	fieldReturnType: ${this.fieldReturnType},
	value: ${this.value},
}`.split(`
`).map((n)=>{if(n.length<=200)return n;let r=n.indexOf(" "),o=r===-1?200:r+1;return n.slice(0,o)+"...,"}).join(`
`)}}});class zt{static fromBuffer(e,t){let n=si(t),r=n.getCanonicalPath().toString(),o=new File(r,"w");return o.write(e.buffer),o.close(),Vu(r,t),new zt(r,n,t)}constructor(e,t,n){this.path=e,this.file=t,this._factory=n}load(){let{_factory:e}=this,{codeCacheDir:t}=e,n=e.use("dalvik.system.DexClassLoader"),r=e.use("java.io.File"),o=this.file;if(o===null)o=e.use("java.io.File").$new(this.path);if(!o.exists())throw Error("File not found");r.$new(t).mkdirs(),e.loader=n.$new(o.getCanonicalPath(),t,null,e.loader),G.preventDetachDueToClassLoader()}getClassNames(){let{_factory:e}=this,t=e.use("dalvik.system.DexFile"),n=si(e),r=t.loadDex(this.path,n.getCanonicalPath(),0),o=[],i=r.entries();while(i.hasMoreElements())o.push(i.nextElement().toString());return o}}function si(e){let{cacheDir:t,tempFileNaming:n}=e,r=e.use("java.io.File"),o=r.$new(t);return o.mkdirs(),r.createTempFile(n.prefix,n.suffix+".dex",o)}function Vu(e,t){t.use("java.io.File").$new(e).setWritable(!1,!1)}function Bu(){switch(de.state){case"empty":{de.state="pending";let e=de.factories[0],t=e.use("java.util.HashMap"),n=e.use("java.lang.Integer");de.loaders=t.$new(),de.Integer=n;let r=e.loader;if(r!==null)pr(e,r);return de.state="ready",de}case"pending":do Thread.sleep(0.05);while(de.state==="pending");return de;case"ready":return de}}function pr(e,t){let{factories:n,loaders:r,Integer:o}=de,i=o.$new(n.indexOf(e));r.put(t,i);for(let s=t.getParent();s!==null;s=s.getParent()){if(r.containsKey(s))break;r.put(s,i)}}function mi(e){let t=et.get(e);if(t===void 0)t=0;t++,et.set(e,t)}function gi(e){let t=et.get(e);if(t===void 0)throw Error(`Thread ${e} is not ignored`);if(t--,t===0)et.delete(e);else et.set(e,t)}function Ju(e){return e.slice(e.lastIndexOf(".")+1)}function hr(e,t){let n=[],r=e.getArrayLength(t);for(let o=0;o!==r;o++){let i=e.getObjectArrayElement(t,o);try{n.push(e.getTypeName(i))}finally{e.deleteLocalRef(i)}}return n}function Gu(e){let t=e.split(".");return t[t.length-1]+".java"}var $u=4,bi=Process.pointerSize;class Ei{ACC_PUBLIC=1;ACC_PRIVATE=2;ACC_PROTECTED=4;ACC_STATIC=8;ACC_FINAL=16;ACC_SYNCHRONIZED=32;ACC_BRIDGE=64;ACC_VARARGS=128;ACC_NATIVE=256;ACC_ABSTRACT=1024;ACC_STRICT=2048;ACC_SYNTHETIC=4096;constructor(){this.classFactory=null,this.ClassFactory=Re,this.vm=null,this.api=null,this._initialized=!1,this._apiError=null,this._wakeupHandler=null,this._pollListener=null,this._pendingMainOps=[],this._pendingVmOps=[],this._cachedIsAppProcess=null;try{this._tryInitialize()}catch(e){}}_tryInitialize(){if(this._initialized)return!0;if(this._apiError!==null)throw this._apiError;let e;try{e=pt(),this.api=e}catch(n){throw this._apiError=n,n}if(e===null)return!1;let t=new Se(e);return this.vm=t,Yo(t),Re._initialize(t,e),this.classFactory=new Re,this._initialized=!0,!0}_dispose(){if(this.api===null)return;let{vm:e}=this;e.perform((t)=>{Re._disposeAll(t),b.dispose(t)}),Script.nextTick(()=>{Se.dispose(e)})}get available(){return this._tryInitialize()}get androidVersion(){return lt()}synchronized(e,t){let{$h:n=e}=e;if(!(n instanceof NativePointer))throw Error("Java.synchronized: the first argument `obj` must be either a pointer or a Java instance");let r=this.vm.getEnv();ce("VM::MonitorEnter",r.monitorEnter(n));try{t()}finally{r.monitorExit(n)}}enumerateLoadedClasses(e){this._checkAvailable();let{flavor:t}=this.api;if(t==="jvm")this._enumerateLoadedClassesJvm(e);else if(t==="art")this._enumerateLoadedClassesArt(e);else this._enumerateLoadedClassesDalvik(e)}enumerateLoadedClassesSync(){let e=[];return this.enumerateLoadedClasses({onMatch(t){e.push(t)},onComplete(){}}),e}enumerateClassLoaders(e){this._checkAvailable();let{flavor:t}=this.api;if(t==="jvm")this._enumerateClassLoadersJvm(e);else if(t==="art")this._enumerateClassLoadersArt(e);else throw Error("Enumerating class loaders is not supported on Dalvik")}enumerateClassLoadersSync(){let e=[];return this.enumerateClassLoaders({onMatch(t){e.push(t)},onComplete(){}}),e}_enumerateLoadedClassesJvm(e){let{api:t,vm:n}=this,{jvmti:r}=t,o=n.getEnv(),i=Memory.alloc($u),s=Memory.alloc(bi);r.getLoadedClasses(i,s);let l=i.readS32(),a=s.readPointer(),c=[];for(let d=0;d!==l;d++)c.push(a.add(d*bi).readPointer());r.deallocate(a);try{for(let d of c){let p=o.getClassName(d);e.onMatch(p,d)}e.onComplete()}finally{c.forEach((d)=>{o.deleteLocalRef(d)})}}_enumerateClassLoadersJvm(e){this.choose("java.lang.ClassLoader",e)}_enumerateLoadedClassesArt(e){let{vm:t,api:n}=this,r=t.getEnv(),o=n["art::JavaVMExt::AddGlobalRef"],{vm:i}=n;he(t,r,(s)=>{let l=An((a)=>{let c=o(i,s,a);try{let d=r.getClassName(c);e.onMatch(d,c)}finally{r.deleteGlobalRef(c)}return!0});n["art::ClassLinker::VisitClasses"](n.artClassLinker.address,l)}),e.onComplete()}_enumerateClassLoadersArt(e){let{classFactory:t,vm:n,api:r}=this,o=n.getEnv(),i=r["art::ClassLinker::VisitClassLoaders"];if(i===void 0)throw Error("This API is only available on Android >= 7.0");let s=t.use("java.lang.ClassLoader"),l=[],a=r["art::JavaVMExt::AddGlobalRef"],{vm:c}=r;he(n,o,(d)=>{let p=Nn((u)=>(l.push(a(c,d,u)),!0));Tn(()=>{i(r.artClassLinker.address,p)})});try{l.forEach((d)=>{let p=t.cast(d,s);e.onMatch(p)})}finally{l.forEach((d)=>{o.deleteGlobalRef(d)})}e.onComplete()}_enumerateLoadedClassesDalvik(e){let{api:t}=this,n=ptr("0xcbcacccd"),r=172,o=8,s=t.gDvm.add(172).readPointer(),l=s.readS32(),c=s.add(12).readPointer(),d=l*8;for(let p=0;p<d;p+=8){let h=c.add(p).add(4).readPointer();if(h.isNull()||h.equals(n))continue;let f=h.add(24).readPointer().readUtf8String();if(f.startsWith("L")){let m=f.substring(1,f.length-1).replace(/\//g,".");e.onMatch(m)}}e.onComplete()}enumerateMethods(e){let{classFactory:t}=this,n=this.vm.getEnv(),r=t.use("java.lang.ClassLoader");return Ve.enumerateMethods(e,this.api,n).map((o)=>{let i=o.loader;return o.loader=i!==null?t.wrap(i,r,n):null,o})}scheduleOnMainThread(e){this.performNow(()=>{this._pendingMainOps.push(e);let{_wakeupHandler:t}=this;if(t===null){let{classFactory:n}=this,r=n.use("android.os.Handler"),o=n.use("android.os.Looper");t=r.$new(o.getMainLooper()),this._wakeupHandler=t}if(this._pollListener===null)this._pollListener=Interceptor.attach(Process.getModuleByName("libc.so").getExportByName("epoll_wait"),this._makePollHook()),Interceptor.flush();t.sendEmptyMessage(1)})}_makePollHook(){let e=Process.id,{_pendingMainOps:t}=this;return function(){if(this.threadId!==e)return;let n;while((n=t.shift())!==void 0)try{n()}catch(r){Script.nextTick(()=>{throw r})}}}perform(e){if(this._checkAvailable(),!this._isAppProcess()||this.classFactory.loader!==null)try{this.vm.perform(e)}catch(t){Script.nextTick(()=>{throw t})}else if(this._pendingVmOps.push(e),this._pendingVmOps.length===1)this._performPendingVmOpsWhenReady()}performNow(e){return this._checkAvailable(),this.vm.perform(()=>{let{classFactory:t}=this;if(this._isAppProcess()&&t.loader===null){let r=t.use("android.app.ActivityThread").currentApplication();if(r!==null)mr(t,r)}return e()})}_performPendingVmOpsWhenReady(){this.vm.perform(()=>{let{classFactory:e}=this,t=e.use("android.app.ActivityThread"),n=t.currentApplication();if(n!==null){mr(e,n),this._performPendingVmOps();return}let r=this,o=!1,i="early",s=t.handleBindApplication;s.implementation=function(d){if(d.instrumentationName.value!==null){i="late";let u=e.use("android.app.LoadedApk").makeApplication;u.implementation=function(h,_){if(!o)o=!0,yi(e,this),r._performPendingVmOps();return u.apply(this,arguments)}}s.apply(this,arguments)};let a=t.getPackageInfo.overloads.map((d)=>[d.argumentTypes.length,d]).sort(([d],[p])=>p-d).map(([d,p])=>p)[0];a.implementation=function(...d){let p=a.call(this,...d);if(!o&&i==="early")o=!0,yi(e,p),r._performPendingVmOps();return p};let c=()=>{r.vm.perform(()=>{let d=t.currentApplication();if(o)return;if(d===null){setTimeout(c,50);return}o=!0,mr(e,d),r._performPendingVmOps()})};setTimeout(c,50)})}_performPendingVmOps(){let{vm:e,_pendingVmOps:t}=this,n;while((n=t.shift())!==void 0)try{e.perform(n)}catch(r){Script.nextTick(()=>{throw r})}}use(e,t){return this.classFactory.use(e,t)}openClassFile(e){return this.classFactory.openClassFile(e)}choose(e,t){this.classFactory.choose(e,t)}retain(e){return this.classFactory.retain(e)}cast(e,t){return this.classFactory.cast(e,t)}array(e,t){return this.classFactory.array(e,t)}backtrace(e){return kn(this.vm,e)}isMainThread(){let e=this.classFactory.use("android.os.Looper"),t=e.getMainLooper(),n=e.myLooper();if(n===null)return!1;return t.$isSameObject(n)}registerClass(e){return this.classFactory.registerClass(e)}deoptimizeEverything(){let{vm:e}=this;return Pn(e,e.getEnv())}deoptimizeBootImage(){let{vm:e}=this;return Fn(e,e.getEnv())}deoptimizeMethod(e){let{vm:t}=this;return Rn(t,t.getEnv(),e)}isMethodDeoptimized(e){let{vm:t}=this;return Dn(t,t.getEnv(),e)}_checkAvailable(){if(!this.available)throw Error("Java API not available")}_isAppProcess(){let e=this._cachedIsAppProcess;if(e===null){if(this.api.flavor==="jvm")return e=!1,this._cachedIsAppProcess=e,e;let t=new NativeFunction(Module.getGlobalExportByName("readlink"),"pointer",["pointer","pointer","pointer"],{exceptions:"propagate"}),n=Memory.allocUtf8String("/proc/self/exe"),r=1024,o=Memory.alloc(r),i=t(n,o,ptr(r)).toInt32();if(i!==-1){let s=o.readUtf8String(i);e=/^\/system\/bin\/app_process/.test(s)}else e=!0;this._cachedIsAppProcess=e}return e}}function mr(e,t){let n=e.use("android.os.Process");if(e.loader=t.getClassLoader(),n.myUid()===n.SYSTEM_UID.value)e.cacheDir="/data/system",e.codeCacheDir="/data/dalvik-cache";else if("getCodeCacheDir"in t)e.cacheDir=t.getCacheDir().getCanonicalPath(),e.codeCacheDir=t.getCodeCacheDir().getCanonicalPath();else e.cacheDir=t.getFilesDir().getCanonicalPath(),e.codeCacheDir=t.getCacheDir().getCanonicalPath()}function yi(e,t){let n=e.use("java.io.File");e.loader=t.getClassLoader();let r=n.$new(t.getDataDir()).getCanonicalPath();e.cacheDir=r,e.codeCacheDir=r+"/cache"}var gr=new Ei;Script.bindWeak(gr,()=>{gr._dispose()});var tt=gr;var br={device:"amethyst",incremental:"OS3.0.303.0.WOPINXM",sdk:36};function vi(e){if(!Number.isInteger(e)||e<3||e>256)throw RangeError("Choose an integer from 3 to 256.");return e}function Si(e,t,n){return e===br.device&&t===br.incremental&&n===br.sdk}function wi(e,t,n){if(e!==2)return e;try{return n()?t:e}catch{return e}}var Hu="com.android.server.wm.MiuiFreeFormStackDisplayStrategy",Ii="com.android.server.wm.MiuiFreeFormActivityStack",gt;function Zu(){for(let e of tt.enumerateClassLoadersSync())try{return tt.ClassFactory.get(e).use(Hu)}catch(t){if(!String(t).includes("ClassNotFoundException"))throw t}throw Error("The HyperOS window strategy is unavailable.")}rpc.exports={init(e,t){let n=vi(t?.limit);if(Process.findModuleByName("libandroid_servers.so")===null)throw Error("This module is for system_server.");if(gt)throw Error("The limit override is already active.");tt.performNow(()=>{let r=tt.use("android.os.Build"),o=tt.use("android.os.Build$VERSION");if(!Si(r.DEVICE.value,o.INCREMENTAL.value,o.SDK_INT.value))throw Error("This module is for amethyst OS3.0.303.0.WOPINXM.");let i=Zu(),s=i.getMaxMiuiFreeFormStackCount.overload("java.lang.String",Ii),l=i.isInEmbeddedWindowingMode.overload(Ii),a=i.isSplitScreenMode.overload();if(s.returnType.className!=="int"||l.returnType.className!=="boolean"||a.returnType.className!=="boolean")throw Error("The window strategy has unexpected method signatures.");s.implementation=function(c,d){let p=s.call(this,c,d);return wi(p,n,()=>d!==null&&!l.call(this,d)&&!a.call(this))},gt=s,console.log(`Normal floating-window cap set to ${n} for this session.`)})},dispose(){if(!gt)return;gt.implementation=null,gt=void 0}};})();
