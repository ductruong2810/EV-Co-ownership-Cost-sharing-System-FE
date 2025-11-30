package com.group8.evcoownership.controller;

import com.group8.evcoownership.dto.AuditLogRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit")
@Tag(name = "Audit", description = "Endpoints for recording important staff/technician actions")
public class AuditController {

    @PostMapping("/logs")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','TECHNICIAN')")
    @Operation(
            summary = "Create an audit log entry",
            description = """
                    Lightweight endpoint used by the frontend to record important actions such as:
                    - Staff approving / rejecting user documents
                    - Technician creating or completing maintenance tasks
                    - Staff reviewing vehicle inspection reports

                    The backend can later persist this data to a database or a log sink for compliance/debugging.
                    """,
            responses = {
                    @ApiResponse(responseCode = "204", description = "Log accepted and recorded"),
                    @ApiResponse(
                            responseCode = "400",
                            description = "Invalid payload",
                            content = @Content(schema = @Schema(implementation = String.class))
                    )
            }
    )
    public ResponseEntity<Void> createAuditLog(@RequestBody AuditLogRequest request) {
        // NOTE: For now we only expose the contract for FE.
        // You can later plug this into a proper AuditService that persists to DB or external log store.
        return ResponseEntity.noContent().build();
    }
}


