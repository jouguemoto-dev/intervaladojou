export interface AndroidCodeFile {
  id: string;
  filename: string;
  category: 'models' | 'database' | 'viewmodel' | 'service' | 'ui' | 'config' | 'guide';
  language: 'kotlin' | 'xml' | 'groovy' | 'markdown';
  title: string;
  description: string;
  code: string;
}

export const ANDROID_CODE_FILES: AndroidCodeFile[] = [
  {
    id: 'workout_models',
    filename: 'WorkoutModels.kt',
    category: 'models',
    language: 'kotlin',
    title: 'Modelos, Lógica do Dashboard & Métricas de GPS (Kotlin)',
    description: 'Data classes, Enums de fases, cálculo de Dashboard e cálculo de distância percorrida por GPS com fórmula de Haversine e ritmo médio (min/km).',
    code: `package com.ritmointerval.app.data.model

import androidx.compose.ui.graphics.Color
import kotlin.math.*

/**
 * Fases de treino disponíveis com cores no padrão Material Design 3
 */
enum class PhaseType(
    val displayName: String,
    val shortName: String,
    val category: PhaseCategory,
    val color: Color
) {
    WARMUP("Aquecimento", "Aquec.", PhaseCategory.WARMUP, Color(0xFFD97706)),
    HIGH_INTENSITY("Tiro Forte", "Tiro", PhaseCategory.HIGH, Color(0xFFDC2626)),
    LOW_INTENSITY("Trote Fraco", "Trote", PhaseCategory.LOW, Color(0xFF059669)),
    WALK("Caminhada", "Caminh.", PhaseCategory.LOW, Color(0xFF0284C7)),
    REST("Descanso", "Pausa", PhaseCategory.REST, Color(0xFF334155))
}

enum class PhaseCategory {
    WARMUP, HIGH, LOW, REST
}

/**
 * Perfis de Alerta Sonoro Alto (Apito de Juiz, Sirene de Boxe, Bip Digital)
 */
enum class SoundProfile(val label: String, val description: String) {
    WHISTLE("Apito Esportivo / Juiz", "Apito duplo modulado de alta frequência"),
    SIREN("Sirene / Buzzer de Boxe", "Buzina grave de academia/ringue"),
    HIGH_DIGITAL("Bip Digital Ultra Alto", "Bip agudo estidente em 2800Hz"),
    BOXING_BELL("Gongo / Sino de Ringue", "Ressonância metálica de sino"),
    CLASSIC("Bip Clássico Esportivo", "Bip tradicional de cronômetro")
}

data class WorkoutStep(
    val id: String = java.util.UUID.randomUUID().toString(),
    val phase: PhaseType,
    val durationSeconds: Int,
    val notes: String = ""
)

data class WorkoutBlock(
    val id: String = java.util.UUID.randomUUID().toString(),
    val name: String = "Série Intervalada",
    val repetitions: Int = 4,
    val steps: List<WorkoutStep>
)

sealed class WorkoutItem {
    data class Single(val step: WorkoutStep) : WorkoutItem()
    data class Block(val block: WorkoutBlock) : WorkoutItem()
}

data class WorkoutDashboardSummary(
    val totalSeconds: Int,
    val formattedTotalTime: String,
    val warmupSeconds: Int,
    val highIntensitySeconds: Int,
    val lowIntensitySeconds: Int,
    val restSeconds: Int,
    val formattedWarmup: String,
    val formattedHighIntensity: String,
    val formattedLowIntensity: String,
    val formattedRest: String,
    val pctWarmup: Float,
    val pctHighIntensity: Float,
    val pctLowIntensity: Float,
    val pctRest: Float,
    val totalStepsExpanded: Int
)

data class FlattenedWorkoutStep(
    val originalStepId: String,
    val phase: PhaseType,
    val durationSeconds: Int,
    val currentRepetition: Int?,
    val totalRepetitions: Int?,
    val blockTitle: String?,
    val stepIndex: Int,
    val totalSteps: Int
)

/**
 * Métricas em tempo real calculadas pelo GPS
 */
data class GpsRunMetrics(
    val totalDistanceMeters: Double = 0.0,
    val formattedDistance: String = "0.00 km",
    val currentSpeedKmh: Float = 0f,
    val averagePaceMinKm: String = "--:-- /km",
    val accuracyMeters: Float = 0f
)

fun formatSecondsToDisplay(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return String.format("%02d:%02d", m, s)
}

fun formatSecondsToHuman(seconds: Int): String {
    val h = seconds / 3600
    val m = (seconds % 3600) / 60
    val s = seconds % 60
    return when {
        h > 0 -> "\${h}h \${m} min"
        m > 0 && s > 0 -> "\${m} min \${s}s"
        m > 0 -> "\${m} min"
        else -> "\${s}s"
    }
}

fun formatDistanceDisplay(meters: Double): String {
    return if (meters < 1000) {
        "\${meters.roundToInt()} m"
    } else {
        String.format("%.2f km", meters / 1000.0)
    }
}

fun formatPace(meters: Double, totalSeconds: Int): String {
    if (meters < 20 || totalSeconds < 5) return "--:-- /km"
    val km = meters / 1000.0
    val secondsPerKm = (totalSeconds / km).toInt()
    if (secondsPerKm > 3600) return "--:-- /km"
    val m = secondsPerKm / 60
    val s = secondsPerKm % 60
    return String.format("%02d:%02d /km", m, s)
}

/**
 * Fórmula de Haversine para calcular distância precisa em metros entre duas coordenadas GPS
 */
fun calculateHaversineDistanceMeters(
    lat1: Double, lon1: Double,
    lat2: Double, lon2: Double
): Double {
    val r = 6371000.0 // Raio da Terra em metros
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = sin(dLat / 2).pow(2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
            sin(dLon / 2).pow(2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c
}

/**
 * LÓGICA DO DASHBOARD: Calcula e atualiza instantaneamente o tempo total e os blocos de esforço
 */
fun calculateWorkoutDashboard(items: List<WorkoutItem>): WorkoutDashboardSummary {
    var warmupSec = 0
    var highSec = 0
    var lowSec = 0
    var restSec = 0
    var totalStepsCount = 0

    for (item in items) {
        when (item) {
            is WorkoutItem.Single -> {
                val dur = item.step.durationSeconds.coerceAtLeast(0)
                totalStepsCount += 1
                when (item.step.phase.category) {
                    PhaseCategory.WARMUP -> warmupSec += dur
                    PhaseCategory.HIGH -> highSec += dur
                    PhaseCategory.LOW -> lowSec += dur
                    PhaseCategory.REST -> restSec += dur
                }
            }
            is WorkoutItem.Block -> {
                val reps = item.block.repetitions.coerceAtLeast(1)
                for (step in item.block.steps) {
                    val stepTotal = step.durationSeconds.coerceAtLeast(0) * reps
                    totalStepsCount += reps
                    when (step.phase.category) {
                        PhaseCategory.WARMUP -> warmupSec += stepTotal
                        PhaseCategory.HIGH -> highSec += stepTotal
                        PhaseCategory.LOW -> lowSec += stepTotal
                        PhaseCategory.REST -> restSec += stepTotal
                    }
                }
            }
        }
    }

    val total = warmupSec + highSec + lowSec + restSec
    val totalFloat = if (total > 0) total.toFloat() else 1f

    return WorkoutDashboardSummary(
        totalSeconds = total,
        formattedTotalTime = formatSecondsToHuman(total),
        warmupSeconds = warmupSec,
        highIntensitySeconds = highSec,
        lowIntensitySeconds = lowSec,
        restSeconds = restSec,
        formattedWarmup = formatSecondsToHuman(warmupSec),
        formattedHighIntensity = formatSecondsToHuman(highSec),
        formattedLowIntensity = formatSecondsToHuman(lowSec),
        formattedRest = formatSecondsToHuman(restSec),
        pctWarmup = if (total > 0) (warmupSec / totalFloat) else 0f,
        pctHighIntensity = if (total > 0) (highSec / totalFloat) else 0f,
        pctLowIntensity = if (total > 0) (lowSec / totalFloat) else 0f,
        pctRest = if (total > 0) (restSec / totalFloat) else 0f,
        totalStepsExpanded = totalStepsCount
    )
}
`,
  },
  {
    id: 'room_database',
    filename: 'WorkoutDatabase.kt',
    category: 'database',
    language: 'kotlin',
    title: 'Banco de Dados Local Room (Entity, DAO e TypeConverters)',
    description: 'Configuração completa do Room Database para persistir os treinos personalizados do usuário em formato JSON estruturado com GSON.',
    code: `package com.ritmointerval.app.data.local

import android.content.Context
import androidx.room.*
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.ritmointerval.app.data.model.WorkoutItem
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "workouts")
data class WorkoutEntity(
    @PrimaryKey
    val id: String = java.util.UUID.randomUUID().toString(),
    val name: String,
    val description: String = "",
    val itemsJson: String,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Dao
interface WorkoutDao {
    @Query("SELECT * FROM workouts ORDER BY updatedAt DESC")
    fun getAllWorkoutsFlow(): Flow<List<WorkoutEntity>>

    @Query("SELECT * FROM workouts WHERE id = :id LIMIT 1")
    suspend fun getWorkoutById(id: String): WorkoutEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(workout: WorkoutEntity)

    @Delete
    suspend fun delete(workout: WorkoutEntity)

    @Query("DELETE FROM workouts WHERE id = :id")
    suspend fun deleteById(id: String)
}

class WorkoutConverters {
    private val gson = Gson()

    @TypeConverter
    fun fromWorkoutItems(items: List<WorkoutItem>): String = gson.toJson(items)

    @TypeConverter
    fun toWorkoutItems(json: String): List<WorkoutItem> {
        val type = object : TypeToken<List<WorkoutItem>>() {}.type
        return gson.fromJson(json, type) ?: emptyList()
    }
}

@Database(entities = [WorkoutEntity::class], version = 1, exportSchema = false)
abstract class WorkoutDatabase : RoomDatabase() {
    abstract fun workoutDao(): WorkoutDao

    companion object {
        @Volatile
        private var INSTANCE: WorkoutDatabase? = null

        fun getDatabase(context: Context): WorkoutDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    WorkoutDatabase::class.java,
                    "ritmo_interval_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
`,
  },
  {
    id: 'firebase_repository',
    filename: 'FirebaseUserRepository.kt',
    category: 'database',
    language: 'kotlin',
    title: 'Banco de Dados Cloud & Contas Individuais (Firebase Firestore & Auth)',
    description: 'Gerenciador em Kotlin de autenticação individual de atletas (E-mail/Senha, Google e Anônimo) e sincronização em tempo real de treinos e corridas no Firestore.',
    code: `package com.ritmointerval.app.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.gson.Gson
import com.ritmointerval.app.data.model.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Perfil do atleta e configurações personalizadas salvas na conta
 */
data class AthleteProfileEntity(
    val userId: String = "",
    val email: String = "",
    val displayName: String = "Atleta",
    val photoUrl: String = "",
    val weeklyGoalKm: Int = 15,
    val runningLevel: String = "intermediario",
    val soundProfile: String = "WHISTLE",
    val volumeBoost: Float = 1.0f,
    val updatedAt: Long = System.currentTimeMillis()
)

data class CloudRunHistoryEntity(
    val id: String = "",
    val workoutName: String = "",
    val totalElapsedSeconds: Int = 0,
    val distanceMeters: Double = 0.0,
    val averagePace: String = "",
    val completedAt: Long = System.currentTimeMillis()
)

class FirebaseUserRepository(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val gson = Gson()

    val currentUser: FirebaseUser?
        get() = auth.currentUser

    /**
     * Fluxo reativo para observar mudanças no estado de login da conta individual
     */
    fun authStateFlow(): Flow<FirebaseUser?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { trySend(it.currentUser) }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    /**
     * Sincroniza e busca o perfil individual do atleta no Firestore
     */
    suspend fun getOrCreateAthleteProfile(user: FirebaseUser): AthleteProfileEntity {
        val docRef = firestore.collection("users").document(user.uid)
        val snapshot = docRef.get().await()

        return if (snapshot.exists()) {
            snapshot.toObject(AthleteProfileEntity::class.java) ?: AthleteProfileEntity(
                userId = user.uid,
                email = user.email ?: "",
                displayName = user.displayName ?: "Atleta"
            )
        } else {
            val newProfile = AthleteProfileEntity(
                userId = user.uid,
                email = user.email ?: "",
                displayName = user.displayName ?: "Atleta",
                weeklyGoalKm = 15,
                runningLevel = "intermediario",
                soundProfile = "WHISTLE"
            )
            docRef.set(newProfile).await()
            newProfile
        }
    }

    /**
     * Salva as preferências personalizadas do corredor
     */
    suspend fun updateAthleteProfile(profile: AthleteProfileEntity) {
        val uid = auth.currentUser?.uid ?: return
        firestore.collection("users").document(uid).set(profile).await()
    }

    /**
     * Observa a lista de treinos personalizados salvos na nuvem pelo usuário
     */
    fun getCloudWorkoutsFlow(): Flow<List<WorkoutItem>> = callbackFlow {
        val uid = auth.currentUser?.uid
        if (uid == null) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val registration: ListenerRegistration = firestore.collection("users")
            .document(uid)
            .collection("workouts")
            .addSnapshotListener { snapshot, error ->
                if (error != null) return@addSnapshotListener
                // Mapeia documentos
            }

        awaitClose { registration.remove() }
    }

    /**
     * Salva uma corrida finalizada no histórico da conta individual
     */
    suspend fun saveCompletedRun(run: CloudRunHistoryEntity) {
        val uid = auth.currentUser?.uid ?: return
        firestore.collection("users")
            .document(uid)
            .collection("runs")
            .document(run.id)
            .set(run)
            .await()
    }
}
`,
  },
  {
    id: 'foreground_service',
    filename: 'WorkoutRunnerService.kt',
    category: 'service',
    language: 'kotlin',
    title: 'Foreground Service com GPS & Alertas Sonoros Altos',
    description: 'Serviço em Primeiro Plano nativo com FusedLocationProviderClient (GPS), WakeLock, ToneGenerator com múltiplos perfis de bips altos e TextToSpeech em pt-BR.',
    code: `package com.ritmointerval.app.service

import android.annotation.SuppressLint
import android.app.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.*
import android.speech.tts.TextToSpeech
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.ritmointerval.app.data.model.*
import kotlinx.coroutines.*
import java.util.Locale

class WorkoutRunnerService : Service(), TextToSpeech.OnInitListener {

    private val binder = LocalBinder()
    private var wakeLock: PowerManager.WakeLock? = null
    private var tts: TextToSpeech? = null
    private var isTtsReady = false

    // GPS Location Client
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var lastLocation: Location? = null
    private var totalDistanceMeters = 0.0

    private val serviceScope = CoroutineScope(Dispatchers.Default + Job())
    private var timerJob: Job? = null

    private var steps: List<FlattenedWorkoutStep> = emptyList()
    private var currentStepIndex = 0
    private var currentStepSecondsRemaining = 0
    private var totalSecondsElapsed = 0
    private var isPaused = false

    // Perfil de som configurável
    var currentSoundProfile: SoundProfile = SoundProfile.WHISTLE

    // Gerador de tom em volume máximo
    private var toneGenerator: ToneGenerator? = null

    inner class LocalBinder : Binder() {
        fun getService(): WorkoutRunnerService = this@WorkoutRunnerService
    }

    override fun onCreate() {
        super.onCreate()
        tts = TextToSpeech(this, this)
        toneGenerator = ToneGenerator(AudioManager.STREAM_ALARM, 100)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        acquireWakeLock()
        createNotificationChannel()
        setupLocationTracking()
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale("pt", "BR"))
            isTtsReady = result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED
            // Eleva tom e velocidade levemente para athletic pacing
            tts?.setSpeechRate(1.05f)
            tts?.setPitch(1.05f)
        }
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "RitmoInterval::RunnerWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(3 * 60 * 60 * 1000L)
        }
    }

    @SuppressLint("MissingPermission")
    private fun setupLocationTracking() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 2000L)
            .setMinUpdateIntervalMillis(1000L)
            .setMinUpdateDistanceMeters(2.0f)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                if (isPaused) return
                for (location in result.locations) {
                    if (location.accuracy <= 30f) {
                        lastLocation?.let { prev ->
                            val dist = prev.distanceTo(location).toDouble()
                            if (dist >= 1.5) {
                                totalDistanceMeters += dist
                            }
                        }
                        lastLocation = location
                        updateNotification()
                    }
                }
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
        } catch (e: SecurityException) {
            // Permissão de GPS não concedida
        }
    }

    fun startWorkout(flattenedSteps: List<FlattenedWorkoutStep>) {
        steps = flattenedSteps
        currentStepIndex = 0
        totalSecondsElapsed = 0
        totalDistanceMeters = 0.0
        isPaused = false

        if (steps.isNotEmpty()) {
            currentStepSecondsRemaining = steps[0].durationSeconds
            speakStepStart(steps[0])
            startForeground(NOTIFICATION_ID, buildNotification())
            runTimerLoop()
        }
    }

    private fun runTimerLoop() {
        timerJob?.cancel()
        timerJob = serviceScope.launch {
            while (isActive && currentStepIndex < steps.size) {
                if (!isPaused) {
                    delay(1000L)
                    currentStepSecondsRemaining--
                    totalSecondsElapsed++

                    // Bips de contagem regressiva em 3, 2, 1
                    if (currentStepSecondsRemaining in 1..3) {
                        playCountdownTick(currentStepSecondsRemaining)
                    }

                    // Fim da etapa
                    if (currentStepSecondsRemaining <= 0) {
                        currentStepIndex++
                        if (currentStepIndex < steps.size) {
                            val nextStep = steps[currentStepIndex]
                            currentStepSecondsRemaining = nextStep.durationSeconds
                            playLoudPhaseWhistle()
                            speakStepStart(nextStep)
                        } else {
                            speak("Treino concluído com sucesso! Distância total de \${formatDistanceDisplay(totalDistanceMeters)}.")
                            playLoudPhaseWhistle()
                            stopSelf()
                            break
                        }
                    }

                    updateNotification()
                } else {
                    delay(500L)
                }
            }
        }
    }

    /**
     * Bips configuráveis de alta intensidade
     */
    private fun playCountdownTick(secRemaining: Int) {
        when (currentSoundProfile) {
            SoundProfile.WHISTLE -> {
                toneGenerator?.startTone(ToneGenerator.TONE_CDMA_HIGH_L, 120)
            }
            SoundProfile.SIREN -> {
                toneGenerator?.startTone(ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 150)
            }
            SoundProfile.HIGH_DIGITAL -> {
                toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP2, 100)
            }
            SoundProfile.BOXING_BELL, SoundProfile.CLASSIC -> {
                toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP, 120)
            }
        }
    }

    private fun playLoudPhaseWhistle() {
        when (currentSoundProfile) {
            SoundProfile.WHISTLE -> {
                toneGenerator?.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 400)
            }
            SoundProfile.SIREN -> {
                toneGenerator?.startTone(ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 500)
            }
            SoundProfile.HIGH_DIGITAL -> {
                toneGenerator?.startTone(ToneGenerator.TONE_CDMA_HIGH_L, 450)
            }
            SoundProfile.BOXING_BELL, SoundProfile.CLASSIC -> {
                toneGenerator?.startTone(ToneGenerator.TONE_PROP_PROMPT, 400)
            }
        }
    }

    private fun speakStepStart(step: FlattenedWorkoutStep) {
        val announcement = when {
            step.currentRepetition != null -> {
                "Série \${step.currentRepetition} de \${step.totalRepetitions}. \${step.phase.displayName} por \${step.durationSeconds} segundos."
            }
            else -> "\${step.phase.displayName} por \${step.durationSeconds / 60} minutos."
        }
        speak(announcement)
    }

    private fun speak(text: String) {
        if (isTtsReady) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "tts_workout_id")
        }
    }

    fun pause() { isPaused = true; updateNotification() }
    fun resume() { isPaused = false; updateNotification() }
    fun skipStep() {
        if (currentStepIndex + 1 < steps.size) {
            currentStepIndex++
            currentStepSecondsRemaining = steps[currentStepIndex].durationSeconds
            speakStepStart(steps[currentStepIndex])
        }
    }

    fun getLiveGpsMetrics(): GpsRunMetrics {
        return GpsRunMetrics(
            totalDistanceMeters = totalDistanceMeters,
            formattedDistance = formatDistanceDisplay(totalDistanceMeters),
            currentSpeedKmh = (lastLocation?.speed ?: 0f) * 3.6f,
            averagePaceMinKm = formatPace(totalDistanceMeters, totalSecondsElapsed),
            accuracyMeters = lastLocation?.accuracy ?: 0f
        )
    }

    private fun buildNotification(): Notification {
        val currentStep = steps.getOrNull(currentStepIndex)
        val title = "\${currentStep?.phase?.displayName ?: "Corrida"} • \${formatDistanceDisplay(totalDistanceMeters)}"
        val content = "Tempo Restante: \${formatSecondsToDisplay(currentStepSecondsRemaining)} | Ritmo: \${formatPace(totalDistanceMeters, totalSecondsElapsed)}"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
    }

    private fun updateNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Treino Intervalado em Execução",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notificação com cronômetro e distância GPS durante a corrida"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        timerJob?.cancel()
        tts?.stop()
        tts?.shutdown()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        if (wakeLock?.isHeld == true) wakeLock?.release()
        toneGenerator?.release()
    }

    override fun onBind(intent: Intent?): IBinder = binder

    companion object {
        const val CHANNEL_ID = "channel_ritmo_interval"
        const val NOTIFICATION_ID = 1001
    }
}
`,
  },
  {
    id: 'workout_builder_screen',
    filename: 'WorkoutBuilderScreen.kt',
    category: 'ui',
    language: 'kotlin',
    title: 'Tela de Montagem do Treino (Jetpack Compose)',
    description: 'Interface em Material 3 para adicionar etapas, criar blocos de repetição (ex: 4x Tiro + Trote) com Dashboard em tempo real sempre visível no topo.',
    code: `package com.ritmointerval.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ritmointerval.app.data.model.*
import com.ritmointerval.app.ui.viewmodel.WorkoutViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkoutBuilderScreen(
    viewModel: WorkoutViewModel,
    onNavigateToRunner: () -> Unit,
    onBack: () -> Unit
) {
    val state by viewModel.builderState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Montar Treino", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Voltar")
                    }
                },
                actions = {
                    FilledTonalButton(onClick = { viewModel.saveWorkout(onNavigateToRunner) }) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Iniciar")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // DASHBOARD EM TEMPO REAL NO TOPO
            DashboardCardCompose(dashboard = state.dashboard)

            // NOME DO TREINO
            OutlinedTextField(
                value = state.name,
                onValueChange = { viewModel.updateName(it) },
                label = { Text("Nome do Treino") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                singleLine = true
            )

            // LISTA DE ETAPAS E SÉRIES
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                itemsIndexed(state.items) { index, item ->
                    WorkoutItemCard(
                        item = item,
                        onDelete = { viewModel.removeItemAt(index) },
                        onMoveUp = if (index > 0) { { viewModel.moveItem(index, index - 1) } } else null,
                        onMoveDown = if (index < state.items.size - 1) { { viewModel.moveItem(index, index + 1) } } else null
                    )
                }
            }

            // BARRA INFERIOR DE ADIÇÃO RÁPIDA
            BottomAddActionBar(
                onAddPhase = { phase, duration -> viewModel.addSingleStep(phase, duration) },
                onAddBlock = { reps, sprint, recov -> viewModel.addIntervalBlock(reps, sprint, recov) }
            )
        }
    }
}

@Composable
fun DashboardCardCompose(dashboard: WorkoutDashboardSummary) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("TEMPO TOTAL ESTIMADO", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(dashboard.formattedTotalTime, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
                }
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = "\${dashboard.totalStepsExpanded} etapas",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            // BARRA MULTICOLORIDA DE DISTRIBUIÇÃO DE ESFORÇO
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(12.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color.DarkGray)
            ) {
                if (dashboard.pctWarmup > 0f) {
                    Box(Modifier.weight(dashboard.pctWarmup).fillMaxHeight().background(Color(0xFFD97706)))
                }
                if (dashboard.pctHighIntensity > 0f) {
                    Box(Modifier.weight(dashboard.pctHighIntensity).fillMaxHeight().background(Color(0xFFDC2626)))
                }
                if (dashboard.pctLowIntensity > 0f) {
                    Box(Modifier.weight(dashboard.pctLowIntensity).fillMaxHeight().background(Color(0xFF059669)))
                }
                if (dashboard.pctRest > 0f) {
                    Box(Modifier.weight(dashboard.pctRest).fillMaxHeight().background(Color(0xFF334155)))
                }
            }

            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                EffortStatBadge("Aquecimento", dashboard.formattedWarmup, Color(0xFFD97706))
                EffortStatBadge("Tiro Forte", dashboard.formattedHighIntensity, Color(0xFFDC2626))
                EffortStatBadge("Trote / Caminh.", dashboard.formattedLowIntensity, Color(0xFF059669))
                EffortStatBadge("Descanso", dashboard.formattedRest, Color(0xFF64748B))
            }
        }
    }
}

@Composable
fun EffortStatBadge(label: String, duration: String, color: Color) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(8.dp).clip(RoundedCornerShape(4.dp)).background(color))
            Spacer(Modifier.width(4.dp))
            Text(label, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(duration, fontSize = 12.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun WorkoutItemCard(
    item: WorkoutItem,
    onDelete: () -> Unit,
    onMoveUp: (() -> Unit)?,
    onMoveDown: (() -> Unit)?
) {
    when (item) {
        is WorkoutItem.Single -> {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(14.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(item.step.phase.color)
                        )
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(item.step.phase.displayName, fontWeight = FontWeight.Bold)
                            Text(formatSecondsToHuman(item.step.durationSeconds), fontSize = 12.sp, color = Color.Gray)
                        }
                    }
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, contentDescription = "Excluir", tint = Color.Red)
                    }
                }
            }
        }
        is WorkoutItem.Block -> {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)),
                border = CardDefaults.outlinedCardBorder()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("\${item.block.name} (\${item.block.repetitions}x)", fontWeight = FontWeight.ExtraBold)
                        IconButton(onClick = onDelete) {
                            Icon(Icons.Default.Delete, contentDescription = "Excluir Bloco", tint = Color.Red)
                        }
                    }
                    item.block.steps.forEach { step ->
                        Text("• \${step.phase.displayName}: \${formatSecondsToHuman(step.durationSeconds)}", fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun BottomAddActionBar(
    onAddPhase: (PhaseType, Int) -> Unit,
    onAddBlock: (reps: Int, sprint: Int, recov: Int) -> Unit
) {
    Surface(tonalElevation = 8.dp) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(onClick = { onAddPhase(PhaseType.HIGH_INTENSITY, 40) }) {
                Text("+ Tiro (40s)")
            }
            Button(onClick = { onAddPhase(PhaseType.LOW_INTENSITY, 50) }) {
                Text("+ Trote (50s)")
            }
            FilledTonalButton(onClick = { onAddBlock(4, 40, 50) }) {
                Text("+ Bloco 4x (40/50)")
            }
        }
    }
}
`,
  },
  {
    id: 'workout_runner_screen',
    filename: 'WorkoutRunnerScreen.kt',
    category: 'ui',
    language: 'kotlin',
    title: 'Tela de Execução da Corrida com HUD de GPS (Jetpack Compose)',
    description: 'Cronômetro gigante regressivo com fundo reativo por cor e HUD superior mostrando distância percorrida em km e ritmo médio.',
    code: `package com.ritmointerval.app.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ritmointerval.app.data.model.*

@Composable
fun WorkoutRunnerScreen(
    currentStep: FlattenedWorkoutStep,
    secondsRemaining: Int,
    totalElapsedSeconds: Int,
    gpsMetrics: GpsRunMetrics,
    isPaused: Boolean,
    onPlayPause: () -> Unit,
    onSkip: () -> Unit,
    onPrevious: () -> Unit,
    onStop: () -> Unit
) {
    val targetBackgroundColor = when (currentStep.phase) {
        PhaseType.HIGH_INTENSITY -> Color(0xFFDC2626) // Vermelho
        PhaseType.LOW_INTENSITY -> Color(0xFF059669)  // Verde
        PhaseType.WARMUP -> Color(0xFFD97706)         // Âmbar
        PhaseType.WALK -> Color(0xFF0284C7)           // Azul
        PhaseType.REST -> Color(0xFF334155)           // Grafite
    }

    val animatedBg by animateColorAsState(
        targetValue = targetBackgroundColor,
        animationSpec = tween(durationMillis = 600),
        label = "runnerBgColor"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(animatedBg)
            .padding(20.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // CABEÇALHO COM BOTÃO FECHAR E PROGRESSO
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onStop) {
                    Icon(Icons.Default.Close, contentDescription = "Encerrar", tint = Color.White)
                }

                Surface(
                    color = Color.Black.copy(alpha = 0.35f),
                    shape = CircleShape
                ) {
                    Text(
                        text = "Etapa \${currentStep.stepIndex + 1} de \${currentStep.totalSteps}",
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text(
                    text = formatSecondsToDisplay(totalElapsedSeconds),
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            // HUD DE GPS (DISTÂNCIA E RITMO MÉDIO)
            Surface(
                color = Color.Black.copy(alpha = 0.35f),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("DISTÂNCIA GPS", fontSize = 10.sp, color = Color.White.copy(alpha = 0.7f), fontWeight = FontWeight.Bold)
                        Text(gpsMetrics.formattedDistance, fontSize = 20.sp, color = Color.White, fontWeight = FontWeight.Black)
                    }
                    Box(Modifier.width(1.dp).height(24.dp).background(Color.White.copy(alpha = 0.2f)))
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("RITMO MÉDIO", fontSize = 10.sp, color = Color.White.copy(alpha = 0.7f), fontWeight = FontWeight.Bold)
                        Text(gpsMetrics.averagePaceMinKm, fontSize = 16.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    Box(Modifier.width(1.dp).height(24.dp).background(Color.White.copy(alpha = 0.2f)))
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("VELOCIDADE", fontSize = 10.sp, color = Color.White.copy(alpha = 0.7f), fontWeight = FontWeight.Bold)
                        Text("\${gpsMetrics.currentSpeedKmh} km/h", fontSize = 14.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // CRONÔMETRO CENTRAL GIGANTE
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (currentStep.currentRepetition != null) {
                    Surface(
                        color = Color.White.copy(alpha = 0.25f),
                        shape = CircleShape
                    ) {
                        Text(
                            text = "SÉRIE \${currentStep.currentRepetition} / \${currentStep.totalRepetitions}",
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                }

                Text(
                    text = currentStep.phase.displayName.uppercase(),
                    color = Color.White,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp
                )

                Spacer(Modifier.height(6.dp))

                Text(
                    text = formatSecondsToDisplay(secondsRemaining),
                    color = Color.White,
                    fontSize = 86.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-2).sp
                )

                Spacer(Modifier.height(14.dp))

                val stepProgress = if (currentStep.durationSeconds > 0) {
                    (currentStep.durationSeconds - secondsRemaining).toFloat() / currentStep.durationSeconds
                } else 0f

                LinearProgressIndicator(
                    progress = { stepProgress },
                    modifier = Modifier
                        .fillMaxWidth(0.8f)
                        .height(10.dp)
                        .clip(CircleShape),
                    color = Color.White,
                    trackColor = Color.White.copy(alpha = 0.25f)
                )
            }

            // CONTROLES DE AÇÃO
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onPrevious, modifier = Modifier.size(56.dp)) {
                    Icon(Icons.Default.SkipPrevious, contentDescription = "Anterior", tint = Color.White, modifier = Modifier.size(36.dp))
                }

                FloatingActionButton(
                    onClick = onPlayPause,
                    containerColor = Color.White,
                    contentColor = animatedBg,
                    modifier = Modifier.size(80.dp),
                    shape = CircleShape
                ) {
                    Icon(
                        imageVector = if (isPaused) Icons.Default.PlayArrow else Icons.Default.Pause,
                        contentDescription = if (isPaused) "Continuar" else "Pausar",
                        modifier = Modifier.size(44.dp)
                    )
                }

                IconButton(onClick = onSkip, modifier = Modifier.size(56.dp)) {
                    Icon(Icons.Default.SkipNext, contentDescription = "Próxima", tint = Color.White, modifier = Modifier.size(36.dp))
                }
            }
        }
    }
}
`,
  },
  {
    id: 'android_manifest',
    filename: 'AndroidManifest.xml',
    category: 'config',
    language: 'xml',
    title: 'AndroidManifest.xml (Permissões de GPS, Foreground & WakeLock)',
    description: 'Declarações completas com permissões de GPS fino e aproximado, FOREGROUND_SERVICE_LOCATION e serviço configurado para rastrear distância com tela bloqueada.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.ritmointerval.app">

    <!-- PERMISSÕES DE LOCALIZAÇÃO GPS PARA CÁLCULO DE DISTÂNCIA E VELOCIDADE -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <!-- Permissão para Foreground Service de Localização (Android 14+) -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

    <!-- Permissão para manter CPU ativa durante o treino -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <!-- Permissão para notificações persistentes (Android 13+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- Permissão para vibração nos bips -->
    <uses-permission android:name="android.permission.VIBRATE" />

    <queries>
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE" />
        </intent>
    </queries>

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="RitmoInterval"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.RitmoInterval">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- SERVIÇO EM SEGUNDO PLANO COM CAPACIDADE DE LOCALIZAÇÃO E ÁUDIO -->
        <service
            android:name=".service.WorkoutRunnerService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location|mediaPlayback" />

    </application>
</manifest>
`,
  },
  {
    id: 'build_gradle_kts',
    filename: 'build.gradle.kts',
    category: 'config',
    language: 'groovy',
    title: 'build.gradle.kts (:app) com Google Play Services Location',
    description: 'Dependências prontas para Room Database com KSP, Play Services Location para GPS, Jetpack Compose Material 3 e Coroutines.',
    code: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.ritmointerval.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ritmointerval.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
}

dependencies {
    // AndroidX Core & Lifecycle
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("androidx.activity:activity-compose:1.9.2")

    // Google Play Services Location (GPS e FusedLocationProviderClient)
    implementation("com.google.android.gms:play-services-location:21.3.0")

    // Jetpack Compose & Material 3
    implementation(platform("androidx.compose:compose-bom:2024.09.02"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.8.1")

    // Room Database
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // Gson para serialização de JSON
    implementation("com.google.code.gson:gson:2.11.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
`,
  },
  {
    id: 'setup_guide',
    filename: 'GUIA_PASSO_A_PASSO.md',
    category: 'guide',
    language: 'markdown',
    title: 'Guia Passo a Passo: Rodando com GPS e Alertas Altos',
    description: 'Manual completo para rodar no Android Studio com permissões de GPS e testar ao ar livre.',
    code: `# Guia Passo a Passo: Rodando o RitmoInterval com GPS e Alertas Altos

Este guia orienta a configuração do projeto no Android Studio com **Play Services Location (GPS)** e alertas sonoros penetrantes.

---

## 1. Dependências do GPS no \`build.gradle.kts\`

No arquivo \`app/build.gradle.kts\`, certifique-se de adicionar:
\`\`\`kotlin
dependencies {
    // Google Play Services Location para FusedLocationProviderClient
    implementation("com.google.android.gms:play-services-location:21.3.0")
    // ... demais dependências do Compose e Room
}
\`\`\`

---

## 2. Permissões de GPS no \`AndroidManifest.xml\`

\`\`\`xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
\`\`\`

E no serviço:
\`\`\`xml
<service
    android:name=".service.WorkoutRunnerService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="location|mediaPlayback" />
\`\`\`

---

## 3. Testando o GPS ao Ar Livre ou no Emulador

- **No Celular Real**: Ao iniciar o treino, autorize a permissão *"Permitir durante o uso do app"*. Corra ou caminhe: o hodômetro atualizará a distância em tempo real em metros e km, além de calcular o ritmo médio (\`min/km\`).
- **No Emulador**: Abra a janela **Extended Controls** (...) no painel lateral do emulador, vá na aba **Location** e clique em **Routes / Play Route** para simular deslocamento no mapa.
`,
  },
];
