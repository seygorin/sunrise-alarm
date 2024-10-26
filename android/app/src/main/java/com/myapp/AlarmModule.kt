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
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val calendar = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                
                set(Calendar.DAY_OF_WEEK, dayOfWeek)
                
                if (timeInMillis < System.currentTimeMillis()) {
                    add(Calendar.WEEK_OF_YEAR, 1)
                }
            }

            val alarmId = (dayOfWeek * 100) + hour + minute
            
            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_HOUR, hour)
                putExtra(AlarmClock.EXTRA_MINUTES, minute)
                putExtra(AlarmClock.EXTRA_MESSAGE, message)
                putExtra(AlarmClock.EXTRA_VIBRATE, true)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                alarmId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            alarmManager.setRepeating(
                AlarmManager.RTC_WAKEUP,
                calendar.timeInMillis,
                AlarmManager.INTERVAL_DAY * 7, 
                pendingIntent
            )

            Log.d("AlarmModule", "Successfully set alarm for day $dayOfWeek at $hour:$minute")
            promise.resolve("Alarm set successfully for day $dayOfWeek")

        } catch (e: Exception) {
            Log.e("AlarmModule", "Error setting alarm: ${e.message}")
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
}
