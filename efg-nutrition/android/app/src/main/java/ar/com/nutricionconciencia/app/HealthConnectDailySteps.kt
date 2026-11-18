package ar.com.nutricionconciencia.app

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

internal sealed interface DailyStepsResult {
    data class Available(
        val date: LocalDate,
        val total: Long?,
        val distanceMeters: Double?,
        val activeKilocalories: Double?,
    ) : DailyStepsResult
    data object NoData : DailyStepsResult
    data object PermissionRequired : DailyStepsResult
    data object ProviderUnavailable : DailyStepsResult
}

internal class HealthConnectDailySteps(private val context: Context) {
    private val stepsPermission = HealthPermission.getReadPermission(StepsRecord::class)
    private val distancePermission = HealthPermission.getReadPermission(DistanceRecord::class)
    private val energyPermission = HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class)

    suspend fun readToday(now: Instant = Instant.now()): DailyStepsResult {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            return DailyStepsResult.ProviderUnavailable
        }
        val client = HealthConnectClient.getOrCreate(context)
        val granted = client.permissionController.getGrantedPermissions()
        val metrics = setOfNotNull(
            StepsRecord.COUNT_TOTAL.takeIf { stepsPermission in granted },
            DistanceRecord.DISTANCE_TOTAL.takeIf { distancePermission in granted },
            ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL.takeIf { energyPermission in granted },
        )
        if (metrics.isEmpty()) return DailyStepsResult.PermissionRequired

        // Match the day displayed in Mi Actividad, even when travelling.
        val journalZone = ZoneId.of("America/Argentina/Buenos_Aires")
        val date = now.atZone(journalZone).toLocalDate()
        val start = date.atStartOfDay(journalZone).toInstant()
        if (start >= now) return DailyStepsResult.NoData

        val result = client.aggregate(
            AggregateRequest(
                metrics = metrics,
                timeRangeFilter = TimeRangeFilter.between(start, now),
            ),
        )
        val total = result[StepsRecord.COUNT_TOTAL]
        val distance = result[DistanceRecord.DISTANCE_TOTAL]?.inMeters
        val energy = result[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories
        if (total == null && distance == null && energy == null) return DailyStepsResult.NoData
        return DailyStepsResult.Available(date, total, distance, energy)
    }
}
