package com.confiancecoursier.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

	public static void main(String[] args) {
		loadDotenv(); // expose les variables du fichier .env en propriétés système
		SpringApplication app = new SpringApplication(BackendApplication.class);
		// TICK-068 : arrêt explicite si une variable obligatoire manque (liste complète)
		app.addListeners(new com.confiancecoursier.backend.config.RequiredConfigurationCheck());
		app.run(args);
	}

	/**
	 * Charge un éventuel fichier {@code .env} (présent dans le répertoire de
	 * travail ou un de ses parents) et expose ses variables en propriétés système.
	 * Cela permet à Spring de résoudre les placeholders {@code ${BREVO_API_KEY}}
	 * dans {@code application.properties} sans dépendance externe.
	 *
	 * <p>Les variables d'environnement réelles (déjà définies dans l'OS) ne sont
	 * jamais surchargées. En l'absence de fichier {@code .env}, l'appel est sans effet.
	 */
	private static void loadDotenv() {
		try {
			Path envFile = findDotenv();
			if (envFile == null) {
				return;
			}
			List<String> lines = Files.readAllLines(envFile, StandardCharsets.UTF_8);
			for (String raw : lines) {
				String line = raw.trim();
				if (line.isEmpty() || line.startsWith("#")) {
					continue;
				}
				int eq = line.indexOf('=');
				if (eq <= 0) {
					continue;
				}
				String key = line.substring(0, eq).trim();
				String value = line.substring(eq + 1).trim();
				if ((value.startsWith("\"") && value.endsWith("\""))
						|| (value.startsWith("'") && value.endsWith("'"))) {
					value = value.substring(1, value.length() - 1);
				}
				// Ne surcharge pas une variable d'environnement déjà définie.
				if (System.getenv(key) == null && System.getProperty(key) == null) {
					System.setProperty(key, value);
				}
			}
		} catch (Exception ignored) {
			// .env absent ou illisible : on continue avec l'environnement existant.
		}
	}

	/** Cherche un fichier {@code .env} dans le répertoire courant puis les parents. */
	private static Path findDotenv() {
		Path p = Paths.get("").toAbsolutePath();
		for (int i = 0; i < 4; i++) {
			Path env = p.resolve(".env");
			if (Files.exists(env)) {
				return env;
			}
			Path parent = p.getParent();
			if (parent == null) {
				break;
			}
			p = parent;
		}
		return null;
	}

}
