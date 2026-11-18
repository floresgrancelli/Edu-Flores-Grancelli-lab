package ar.com.nutricionconciencia.app

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

internal sealed interface DailyStepsResult {
    data class Available(val date: LocalDate, val total: Long) : DailyStepsResult
    data object NoData : DailyStepsResult
    data object PermissionRequired : DailyStepsResult
    data object ProviderUnavailable : DailyStepsResult
}

internal class HealthConnectDailySteps(private val context: Context) {
    private val stepsPermission = HealthPermission.getReadPermission(StepsRecord::class)

    suspend fun readToday(now: Instant = Instant.now()): DailyStepsResult {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            return DailyStepsResult.ProviderUnavailable
        }
        val client = HealthConnectClient.getOrCreate(context)
        if (stepsPermission !in client.permissionController.getGrantedPermissions()) {
            return DailyStepsResult.PermissionRequired
        }

        // Match the day displayed in Mi Actividad, even when travelling.
        val journalZone = ZoneId.of("America/Argentina/Buenos_Aires")
        val date = now.atZone(journalZone).toLocalDate()
        val start = date.atStartOfDay(journalZone).toInstant()
        if (start >= now) return DailyStepsResult.NoData

        val result = client.aggregate(
            AggregateRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(start, now),
            ),
        )
        val total = result[StepsRecord.COUNT_TOTAL] ?: return DailyStepsResult.NoData
        return DailyStepsResult.Available(date, total)
    }
}
