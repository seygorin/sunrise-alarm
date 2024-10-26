package com.sunrisealarmseygorinapp

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.provider.AlarmClock
import android.util.Log
import com.facebook.react.bridge.*
import java.util.Calendar

class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AlarmModule"

    @ReactMethod
    fun setAlarm(hour: Int, minute: Int, dayOfWeek: Int, message: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            
            val calendar = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.DAY_OF_WEEK, dayOfWeek)
                
                if (timeInMillis < System.currentTimeMillis()) {
                    add(Calendar.WEEK_OF_YEAR, 1)
                }
            }

            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(AlarmClock.EXTRA_HOUR, hour)
                putExtra(AlarmClock.EXTRA_MINUTES, minute)
                putExtra(AlarmClock.EXTRA_MESSAGE, message)
                putExtra(AlarmClock.EXTRA_VIBRATE, true)
                putExtra(AlarmClock.EXTRA_SKIP_UI, true)
                putExtra(AlarmClock.EXTRA_DAYS, arrayListOf(dayOfWeek)) 
            }

            context.startActivity(intent)

            Log.d("AlarmModule", "Successfully set alarm for day $dayOfWeek at $hour:$minute")
            promise.resolve("Alarm set successfully for day $dayOfWeek")

        } catch (e: Exception) {
            Log.e("AlarmModule", "Error setting alarm: ${e.message}")
            promise.reject("ERROR", "Failed to set alarm: ${e.message}")
        }
    }
}
