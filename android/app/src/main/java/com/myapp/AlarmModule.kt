package com.myapp

import android.content.Context
import android.content.Intent
import android.provider.AlarmClock
import com.facebook.react.bridge.*

class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AlarmModule"

    @ReactMethod
    fun setAlarm(hour: Int, minute: Int, dayOfWeek: Int, message: String, promise: Promise) {
        val currentActivity = currentActivity ?: run {
            promise.reject("ERROR", "Activity is null")
            return
        }

        dismissExistingAlarm(currentActivity, message)

        val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
            putExtra(AlarmClock.EXTRA_HOUR, hour)
            putExtra(AlarmClock.EXTRA_MINUTES, minute)
            putExtra(AlarmClock.EXTRA_DAYS, arrayListOf(dayOfWeek))
            putExtra(AlarmClock.EXTRA_MESSAGE, message)
            putExtra(AlarmClock.EXTRA_VIBRATE, true)
            putExtra(AlarmClock.EXTRA_SKIP_UI, true)
        }

        try {
            currentActivity.startActivity(intent)
            promise.resolve("Alarm set successfully")
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to set alarm: ${e.message}")
        }
    }

    private fun dismissExistingAlarm(context: Context, message: String) {
        val intent = Intent(AlarmClock.ACTION_DISMISS_ALARM).apply {
            putExtra(AlarmClock.EXTRA_ALARM_SEARCH_MODE, AlarmClock.ALARM_SEARCH_MODE_LABEL)
            putExtra(AlarmClock.EXTRA_MESSAGE, message)
        }

        try {
            context.startActivity(intent)
        } catch (e: Exception) {

        }
    }

    @ReactMethod
    fun cancelAlarm(message: String, promise: Promise) {
        val currentActivity = currentActivity ?: run {
            promise.reject("ERROR", "Activity is null")
            return
        }

        val intent = Intent(AlarmClock.ACTION_DISMISS_ALARM).apply {
            putExtra(AlarmClock.EXTRA_ALARM_SEARCH_MODE, AlarmClock.ALARM_SEARCH_MODE_LABEL)
            putExtra(AlarmClock.EXTRA_MESSAGE, message)
        }

        try {
            currentActivity.startActivity(intent)
            promise.resolve("Alarm cancelled successfully")
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to cancel alarm: ${e.message}")
        }
    }

    @ReactMethod
    fun getAlarmTime(dayOfWeek: Int, promise: Promise) {
        promise.reject("ERROR", "Getting alarm time is not supported on Android")
    }
}