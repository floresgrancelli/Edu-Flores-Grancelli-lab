package ar.com.nutricionconciencia.app

import android.os.Bundle
import android.content.Intent
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.text.NumberFormat

class ActivityConnection : ComponentActivity() {
    private val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
    )
    private lateinit var status: TextView
    private val requestPermissions = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { readActivity() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = (24 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
        }
        panel.addView(TextView(this).apply {
            text = "Actividad de hoy"
            textSize = 26f
        })
        panel.addView(TextView(this).apply {
            text = "Esta prueba lee los totales autorizados de Health Connect y los muestra en este teléfono. Podés modificar los permisos desde Health Connect."
        })
        status = TextView(this)
        panel.addView(status)
        if (intent.action == "android.intent.action.MAIN") {
            panel.addView(Button(this).apply {
                text = "Conectar Health Connect"
                setOnClickListener {
                    if (HealthConnectClient.getSdkStatus(this@ActivityConnection) == HealthConnectClient.SDK_AVAILABLE) {
                        requestPermissions.launch(permissions)
                    } else {
                        status.text = "Health Connect requiere un dispositivo compatible y un proveedor actualizado."
                    }
                }
            })
            panel.addView(Button(this).apply {
                text = "Abrir Mi Actividad con sincronización"
                setOnClickListener {
                    startActivity(Intent(this@ActivityConnection, ActivityWebView::class.java))
                }
            })
            readActivity()
        }
        panel.addView(Button(this).apply {
            text = "Volver"
            setOnClickListener { finish() }
        })
        setContentView(panel)
    }

    private fun readActivity() = lifecycleScope.launch {
        try {
            val formatted = NumberFormat.getNumberInstance()
            val result = HealthConnectDailySteps(this@ActivityConnection).readToday()
            status.text = when (result) {
                is DailyStepsResult.Available -> listOf(
                    "Pasos: " + (result.total?.let(formatted::format) ?: "Sin dato"),
                    "Distancia (km): " + (result.distanceMeters?.div(1000)?.let(formatted::format) ?: "Sin dato"),
                    "Calorías activas (kcal): " + (result.activeKilocalories?.let(formatted::format) ?: "Sin dato"),
                ).joinToString("\n")
                DailyStepsResult.NoData -> "Todavía no hay actividad disponible para hoy."
                DailyStepsResult.PermissionRequired -> "Conectá Health Connect para leer los datos que elijas."
                DailyStepsResult.ProviderUnavailable -> "Health Connect no está disponible en este dispositivo."
            }
        } catch (error: CancellationException) {
            throw error
        } catch (_: Exception) {
            status.text = "No pudimos leer tu actividad. Revisá los permisos y volvé a intentar."
        }
    }
}
