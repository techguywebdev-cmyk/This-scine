package com.thiscene.app;

import com.google.androidbrowserhelper.trusted.NotificationPermissionRequestHandler;

public class DelegationService extends com.google.androidbrowserhelper.trusted.DelegationService {
    @Override
    public void onCreate() {
        super.onCreate();
        // Android 13+: lets the site ask for notification permission on behalf of the app
        registerExtraCommandHandler(new NotificationPermissionRequestHandler());
    }
}
